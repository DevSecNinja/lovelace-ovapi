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
    components = Path(ha.locate_file("homeassistant/components"))
    matched = set()
    for path in components.glob("*/manifest.json"):
        for value in json.loads(path.read_text()).get("requirements", []):
            requirement = Requirement(value)
            name = canonicalize_name(requirement.name)
            if name not in pins or (requirement.marker and not requirement.marker.evaluate()):
                continue
            if Version(metadata.version(name)) not in requirement.specifier:
                raise ValueError(f"{name} pin is incompatible with the actual HA {path.parent.name} manifest")
            matched.add(name)
    missing = pins.keys() - {"homeassistant"} - matched
    if missing:
        raise ValueError(f"Runtime pins missing from actual HA component manifests: {', '.join(sorted(missing))}")


if __name__ == "__main__":
    check_runtime()
    print("Actual HA/frontend/Python runtime pins and compatibility verified (not a full HA E2E)")
