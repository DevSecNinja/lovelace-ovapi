"""Verify the actual isolated HA runtime without starting HA or contacting OVAPI."""

from importlib import metadata
import json
from pathlib import Path
import platform
import tomllib

from packaging.requirements import Requirement
from packaging.specifiers import SpecifierSet
from packaging.utils import canonicalize_name
from packaging.version import Version


def parse_pins(text: str) -> dict[str, Requirement]:
    pins = {}
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        requirement = Requirement(line)
        name = canonicalize_name(requirement.name)
        specifiers = list(requirement.specifier)
        if (requirement.url or requirement.marker or requirement.extras or
                len(specifiers) != 1 or specifiers[0].operator != "==" or
                "*" in specifiers[0].version or name in pins):
            raise ValueError(f"{name}: require one unique exact, unconditional runtime pin")
        Version(specifiers[0].version)
        pins[name] = requirement
    for name in ("homeassistant", "home-assistant-frontend"):
        if name not in pins:
            raise ValueError(f"Missing {name} runtime pin")
    return pins


def check_runtime(root: Path = Path(".")) -> None:
    pins = parse_pins((root / "tests/ha-requirements.txt").read_text())
    tools = tomllib.loads((root / ".mise.toml").read_text())["tools"]
    python = Version(platform.python_version())
    if python != Version(tools["python"]):
        raise ValueError("Python differs from .mise.toml; use mise run ha-versions/ha-server")
    for name, requirement in pins.items():
        if Version(metadata.version(name)) not in requirement.specifier:
            raise ValueError(f"Installed {name} differs from tests/ha-requirements.txt")
        supported = metadata.metadata(name).get("Requires-Python")
        if supported and python not in SpecifierSet(supported):
            raise ValueError(f"{name} does not support the pinned Python")
    ha = metadata.distribution("homeassistant")
    manifest = json.loads(Path(ha.locate_file("homeassistant/components/frontend/manifest.json")).read_text())
    frontend = [
        Requirement(value) for value in manifest["requirements"]
        if canonicalize_name(Requirement(value).name) == "home-assistant-frontend"
    ]
    if len(frontend) != 1 or Version(metadata.version("home-assistant-frontend")) not in frontend[0].specifier:
        raise ValueError("Frontend pin is incompatible with the actual Home Assistant manifest")


if __name__ == "__main__":
    check_runtime()
    print("Actual HA/frontend/Python runtime pins and compatibility verified (not a full HA E2E)")
