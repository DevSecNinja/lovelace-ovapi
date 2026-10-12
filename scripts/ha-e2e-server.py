"""Bounded actual Home Assistant runtime; synthetic upstream, loopback only.

Run using the backend's pinned HA Python environment. No live HA is read or changed.
"""

import asyncio
import json
import logging
import os
from pathlib import Path
import shutil
import signal
import sys
import tempfile
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from homeassistant import bootstrap, loader
from homeassistant.auth.const import GROUP_ID_ADMIN
from homeassistant.core import HomeAssistant

logging.basicConfig(level=logging.INFO)

async def main() -> None:
    root = Path.cwd()
    backend = Path(os.environ["OVAPI_BACKEND_PATH"]).resolve()
    work = root / ".ha-e2e"
    work.mkdir(exist_ok=True)
    connection_file = work / "connection.json"
    port = int(os.environ.get("OVAPI_HA_PORT", "18123"))
    with tempfile.TemporaryDirectory(prefix="runtime-", dir=work) as temp:
        config = Path(temp)
        shutil.copytree(backend / "custom_components" / "ovapi", config / "custom_components" / "ovapi")
        (config / "www").mkdir()
        shutil.copy2(root / "dist" / "lovelace-ovapi.js", config / "www" / "lovelace-ovapi.js")
        (config / ".storage").mkdir()
        (config / ".storage" / "onboarding").write_text(json.dumps({
            "version": 4, "minor_version": 1, "key": "onboarding",
            "data": {"done": ["user", "core_config", "integration", "analytics"]},
        }))
        sys.path.insert(0, str(config))
        from custom_components.ovapi.client import parse_board

        fetches = 0

        async def synthetic_fetch(_self, stops):
            nonlocal fetches
            fetches += 1
            now = datetime.now(UTC)
            records = {
                "SYNTHETIC_TRIP": {
                    "TransportType": "TRAM",
                    "LinePublicNumber": "X1",
                    "DestinationName50": "Synthetic destination",
                    "TargetDepartureTime": (now + timedelta(minutes=12)).isoformat(),
                    "ExpectedDepartureTime": (now + timedelta(minutes=14)).isoformat(),
                    "TripStopStatus": "DRIVING",
                },
                "SYNTHETIC_CANCELLED": {
                    "TransportType": "BUS",
                    "LinePublicNumber": "X2",
                    "DestinationName50": "Synthetic cancelled destination",
                    "TargetDepartureTime": (now + timedelta(minutes=18)).isoformat(),
                    "TripStopStatus": "CANCEL",
                },
                "SYNTHETIC_INCOMPLETE": {
                    "TransportType": "TRAM",
                    "TargetDepartureTime": (now + timedelta(minutes=20)).isoformat(),
                },
            }
            return {stop: parse_board({"Passes": records}) for stop in stops}

        hass = HomeAssistant(str(config))
        loader.async_setup(hass)
        hass.config.skip_pip = True
        stop = asyncio.Event()
        for sig in (signal.SIGINT, signal.SIGTERM):
            asyncio.get_running_loop().add_signal_handler(sig, stop.set)
        try:
            with patch("custom_components.ovapi.client.OvapiClient.fetch", synthetic_fetch):
                result = await bootstrap.async_from_config_dict({
                    "homeassistant": {"name": "OVAPI synthetic E2E", "time_zone": "Europe/Amsterdam", "country": "NL"},
                    "http": {"server_host": "127.0.0.1", "server_port": port},
                    "api": {}, "websocket_api": {}, "frontend": {}, "config": {},
                    "lovelace": {"mode": "storage"}, "recorder": {},
                }, hass)
                if result is None:
                    raise RuntimeError("HA bootstrap failed")
                if "frontend" not in hass.config.components:
                    raise RuntimeError("Actual HA frontend unavailable; install tests/ha-requirements.txt")
                user = await hass.auth.async_create_user("Synthetic E2E owner", group_ids=[GROUP_ID_ADMIN])
                refresh = await hass.auth.async_create_refresh_token(user, client_id=f"http://127.0.0.1:{port}/")
                token = hass.auth.async_create_access_token(refresh)
                await hass.async_start()
                connection_file.write_text(json.dumps({
                    "url": f"http://127.0.0.1:{port}",
                    "access_token": token,
                    "refresh_token": refresh.token,
                }))
                connection_file.chmod(0o600)
                print("Synthetic isolated HA ready (credentials only in ignored connection.json)", flush=True)
                try:
                    await asyncio.wait_for(stop.wait(), timeout=600)
                except TimeoutError:
                    print("Bounded 10-minute runtime elapsed", flush=True)
                print(f"Synthetic backend fetches: {fetches}; real upstream fetches: 0", flush=True)
        finally:
            connection_file.unlink(missing_ok=True)
            await hass.async_stop()


asyncio.run(main())
