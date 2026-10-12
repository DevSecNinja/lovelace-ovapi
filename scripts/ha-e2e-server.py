"""Bounded actual Home Assistant runtime; synthetic upstream, loopback only.

Run with mise run ha-server. No live HA is read or changed.
"""

import asyncio
import gzip
import json
import logging
import os
from pathlib import Path
import shutil
import signal
import sys
import tempfile
from datetime import UTC, datetime, timedelta
from types import MappingProxyType
from unittest.mock import patch

import aiohttp

from check_ha_runtime import check_runtime

check_runtime()

from homeassistant import bootstrap, loader
from homeassistant.auth.const import GROUP_ID_ADMIN
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

logging.basicConfig(level=logging.INFO)


class SyntheticResponse:
    """Exercise real backend HTTP parsers without any upstream socket."""

    def __init__(self, body: bytes) -> None:
        self.body = body
        self.status = 200
        self.headers = {"Content-Length": str(len(body))}
        self.content = self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def iter_chunked(self, size):
        for start in range(0, len(self.body), size):
            yield self.body[start:start + size]


def station_document(now: datetime) -> bytes:
    # Mirrors the backend's synthetic Example/Test town station_payload fixture.
    past = (now - timedelta(days=1)).isoformat()
    quays = "".join(
        f"<quay><quaycode>NL:Q:{code}</quaycode><validfrom>{past}</validfrom>"
        f"<quaystatusdata><validfrom>{past}</validfrom><quaystatus>available</quaystatus>"
        f"</quaystatusdata><quaytransportmodes><transportmodedata><validfrom>{past}</validfrom>"
        f"<transportmode>{mode}</transportmode></transportmodedata></quaytransportmodes></quay>"
        for code, mode in (("01234501", "bus"), ("01234502", "metro"))
    )
    return (
        '<export xmlns="http://bison.connekt.nl/tmi8/chb/msg"><stopplaces>'
        '<stopplace placecode="NL:P:example"><stopplacecode>NL:S:one</stopplacecode>'
        f"<validfrom>{past}</validfrom><stopplacename><validfrom>{past}</validfrom>"
        "<publicname>Example</publicname><town>Test town</town></stopplacename>"
        f"<stopplacestatusdata><validfrom>{past}</validfrom><stopplacestatus>available</stopplacestatus>"
        f"</stopplacestatusdata><quays>{quays}</quays></stopplace></stopplaces><places>"
        f"<place><placecode>NL:P:example</placecode><validfrom>{past}</validfrom>"
        "<publicname>Example</publicname><town>Test town</town></place></places></export>"
    ).encode()


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
        fetches = 0
        static_fetches = 0
        station_mode = os.environ.get("OVAPI_STATION_E2E") == "1"
        source_now = datetime.now(UTC)
        filename = f"ExportCHB_{source_now.date()}.xml.gz"
        static_url = "https://data.ndovloket.nl/haltes/"
        archive = gzip.compress(station_document(source_now))

        def synthetic_get(_self, url, **_kwargs):
            nonlocal fetches, static_fetches
            url = str(url)
            if station_mode and url in (static_url, static_url + filename):
                static_fetches += 1
                return SyntheticResponse(
                    archive if url.endswith(".gz") else f'<a href="{filename}">{filename}</a>'.encode()
                )
            prefix, suffix = "http://v0.ovapi.nl/tpc/", "/departures"
            if not url.startswith(prefix) or not url.endswith(suffix):
                raise RuntimeError("Unexpected HTTP GET in offline HA fixture")
            stops = url[len(prefix):-len(suffix)].split(",")
            allowed = {"01234567", "01234501", "01234502"} if station_mode else {"01234567"}
            if not set(stops) <= allowed:
                raise RuntimeError("Unexpected point in offline HA fixture")
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
            boards = {}
            for code in stops:
                if code == "01234501":
                    continue
                passes = {
                    key: {
                        **record,
                        "TimingPointCode": code,
                        "TimingPointName": "Example",
                        "TimingPointTown": "Test town",
                        **({"TransportType": "METRO"} if code == "01234502" else {}),
                    }
                    for key, record in records.items()
                }
                boards[code] = {
                    "Stop": {"TimingPointName": "Example", "TimingPointTown": "Test town"},
                    "Passes": passes,
                }
            return SyntheticResponse(json.dumps(boards).encode())

        hass = HomeAssistant(str(config))
        loader.async_setup(hass)
        hass.config.skip_pip = True
        stop = asyncio.Event()
        for sig in (signal.SIGINT, signal.SIGTERM):
            asyncio.get_running_loop().add_signal_handler(sig, stop.set)
        try:
            with patch.object(aiohttp.ClientSession, "get", synthetic_get):
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
                station_entities = {}
                if station_mode:
                    from custom_components.ovapi.coordinator import identity

                    for key, modes in (("partial", ["bus", "metro"]), ("complete", ["metro"]), ("zero", ["tram"])):
                        options = {"transport_types": modes}
                        entry = ConfigEntry(
                            version=1, minor_version=1, domain="ovapi", source="user",
                            title=f"Synthetic station {key}",
                            data={"stop_id": "chb:NL:P:example", "name": f"Synthetic station {key}"},
                            options=options, unique_id=identity("chb:NL:P:example", options),
                            discovery_keys=MappingProxyType({}), subentries_data=None,
                        )
                        await hass.config_entries.async_add(entry)
                        await hass.async_block_till_done()
                        entity = er.async_get(hass).async_get_entity_id("sensor", "ovapi", entry.entry_id)
                        if entity is None:
                            raise RuntimeError("Synthetic station setup did not create an entity")
                        station_entities[key] = entity
                connection_file.write_text(json.dumps({
                    "url": f"http://127.0.0.1:{port}",
                    "access_token": token,
                    "refresh_token": refresh.token,
                    "station_entities": station_entities,
                }))
                connection_file.chmod(0o600)
                print("Synthetic isolated HA ready (credentials only in ignored connection.json)", flush=True)
                try:
                    await asyncio.wait_for(stop.wait(), timeout=600)
                except TimeoutError:
                    print("Bounded 10-minute runtime elapsed", flush=True)
                print(f"Synthetic live HTTP requests: {fetches}; static HTTP requests: {static_fetches}; real upstream fetches: 0", flush=True)
        finally:
            connection_file.unlink(missing_ok=True)
            await hass.async_stop()


asyncio.run(main())
