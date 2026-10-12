"""Negative and coordinated-upgrade checks use synthetic distribution metadata."""

from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from check_ha_runtime import check_runtime, parse_pins


class RuntimeVersionsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "tests").mkdir()
        (self.root / ".mise.toml").write_text('[tools]\npython = "3.14.8"\n')
        self.requirements = self.root / "tests/ha-requirements.txt"
        self.requirements.write_text("homeassistant==2026.10.1\nhome-assistant-frontend==20260930.3\n")
        self.frontend = self.root / "frontend.json"
        self.frontend.write_text('{"requirements":["home-assistant-frontend==20260930.3"]}')
        self.versions = {"homeassistant": "2026.10.1", "home-assistant-frontend": "20260930.3"}
        self.requires_python = ">=3.14.2"
        for patcher in [
            patch("check_ha_runtime.platform.python_version", return_value="3.14.8"),
            patch("check_ha_runtime.metadata.version", side_effect=lambda name: self.versions[name]),
            patch("check_ha_runtime.metadata.metadata", side_effect=lambda _: {"Requires-Python": self.requires_python}),
            patch("check_ha_runtime.metadata.distribution", return_value=Mock(locate_file=lambda _: self.frontend)),
        ]:
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_current_and_coordinated_ha_frontend_upgrade(self):
        check_runtime(self.root)
        self.requirements.write_text("homeassistant==2026.11.0\nhome-assistant-frontend==20261030.1\n")
        self.versions.update({"homeassistant": "2026.11.0", "home-assistant-frontend": "20261030.1"})
        self.frontend.write_text('{"requirements":["home-assistant-frontend==20261030.1"]}')
        check_runtime(self.root)

    def test_frontend_incompatible_with_actual_ha_manifest(self):
        self.frontend.write_text('{"requirements":["home-assistant-frontend==20260930.4"]}')
        with self.assertRaisesRegex(ValueError, "Frontend pin is incompatible"):
            check_runtime(self.root)

    def test_wrong_installed_ha_and_frontend(self):
        for name in self.versions:
            with self.subTest(name=name):
                original = self.versions[name]
                self.versions[name] = "9999.1.1"
                with self.assertRaisesRegex(ValueError, f"Installed {name} differs"):
                    check_runtime(self.root)
                self.versions[name] = original

    def test_wrong_python(self):
        (self.root / ".mise.toml").write_text('[tools]\npython = "3.15.0"\n')
        with self.assertRaisesRegex(ValueError, "Python differs"):
            check_runtime(self.root)

    def test_python_not_supported_by_ha(self):
        self.requires_python = ">=3.15"
        with self.assertRaisesRegex(ValueError, "does not support"):
            check_runtime(self.root)

    def test_bad_requirement_pins(self):
        for line in ["homeassistant>=2026.10.1", "homeassistant==2026.*", "homeassistant==invalid",
                     "homeassistant @ https://example.invalid/ha.whl",
                     'homeassistant==2026.10.1; python_version>"3"',
                     "homeassistant[extra]==2026.10.1",
                     "homeassistant==2026.10.1\nhomeassistant==2026.10.0"]:
            with self.subTest(line=line), self.assertRaises(ValueError):
                parse_pins(line + "\nhome-assistant-frontend==20260930.3")

    def test_missing_pin(self):
        with self.assertRaisesRegex(ValueError, "Missing"):
            parse_pins("# comments are allowed\n\n")
