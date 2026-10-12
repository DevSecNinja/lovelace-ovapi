import assert from "node:assert/strict";
import { test } from "node:test";
import semver from "semver";
import {
  checkVersions,
  readVersionSources,
} from "../../scripts/check-versions.mjs";

const baseline = readVersionSources();
const minimum = semver.minVersion(baseline.pkg.engines.node).version;
const runtime = {
  nodeVersion: baseline.mise.tools.node,
  miseVersion: baseline.mise.min_version,
};

test("actual release/lock/config pins are coherent without equating independent versions", () => {
  assert.deepEqual(checkVersions(baseline, runtime).node, [
    ...new Set([minimum, baseline.mise.tools.node]),
  ]);
});

for (const [name, mutate, message] of [
  [
    "malformed release",
    (s) => {
      s.pkg.version = "next";
    },
    /exact SemVer/,
  ],
  [
    "lock release drift",
    (s) => {
      s.lock.version = "9.0.0";
    },
    /release version drift/,
  ],
  [
    "lock root drift",
    (s) => {
      s.lock.packages[""].version = "9.0.0";
    },
    /root version drift/,
  ],
  [
    "lock dependency drift",
    (s) => {
      s.lock.packages[""].dependencies.lit = "9.0.0";
    },
    /root dependencies drift/,
  ],
  [
    "lock engine drift",
    (s) => {
      s.lock.packages[""].engines.node = ">=1";
    },
    /root engines drift/,
  ],
  [
    "resolved dependency drift",
    (s) => {
      s.lock.packages["node_modules/lit"].version = "9.0.0";
    },
    /Locked lit drift/,
  ],
  [
    "installed dependency drift",
    (s) => {
      s.installed.lit = "9.0.0";
    },
    /Installed lit drift/,
  ],
  [
    "floating dependency",
    (s) => {
      s.pkg.dependencies.lit = s.lock.packages[""].dependencies.lit = "^3.0.0";
    },
    /exact SemVer/,
  ],
  [
    "unsupported lock format",
    (s) => {
      s.lock.lockfileVersion = 2;
    },
    /Unsupported package-lock/,
  ],
  [
    "malformed engine",
    (s) => {
      s.pkg.engines.node = s.lock.packages[""].engines.node = "current";
    },
    /Invalid Node/,
  ],
  [
    "unsupported broad engine claim",
    (s) => {
      s.pkg.engines.node = s.lock.packages[""].engines.node = ">=22.23.3";
    },
    /exceeds dependency engines/,
  ],
  [
    "mise Node outside range",
    (s) => {
      s.mise.tools.node = "20.0.0";
    },
    /outside supported/,
  ],
  [
    "floating mise tool",
    (s) => {
      s.mise.tools.python = "latest";
    },
    /exact SemVer/,
  ],
  [
    "CI below mise minimum",
    (s) => {
      s.ci.jobs.lint.with["mise-version"] = "2020.1.1";
    },
    /CI mise is below/,
  ],
  [
    "unpinned action",
    (s) => {
      s.ciText = s.ciText.replace(
        /actions\/checkout@[a-f0-9]{40}/,
        "actions/checkout@v7",
      );
    },
    /SHA/,
  ],
  [
    "missing action version comment",
    (s) => {
      s.ciText = s.ciText.replace(" # v7.0.1", "");
    },
    /version comment/,
  ],
  [
    "Spec Kit provenance drift",
    (s) => {
      s.specVersions[0] = "9.0.0";
    },
    /provenance drift/,
  ],
  [
    "floating Specify source",
    (s) => {
      s.mise.tasks.specify.run = "uvx specify-cli specify";
    },
    /Spec Kit source/,
  ],
  [
    "unverified HA minimum claim",
    (s) => {
      s.hacs.homeassistant = "2026.10.0";
    },
    /minimum-runtime test/,
  ],
  [
    "HACS filename drift",
    (s) => {
      s.hacs.filename = "other.js";
    },
    /filename drift/,
  ],
]) {
  test(`rejects ${name}`, () => {
    const sources = structuredClone(baseline);
    mutate(sources);
    assert.throws(() => checkVersions(sources, runtime), message);
  });
}

test("rejects wrong installed runtimes, including an unsupported newer Node", () => {
  for (const nodeVersion of ["20.0.0", "23.0.0", "garbage"]) {
    assert.throws(
      () => checkVersions(baseline, { ...runtime, nodeVersion }),
      /Installed Node/,
    );
  }
  assert.throws(
    () => checkVersions(baseline, { ...runtime, nodeVersion: "22.23.4" }),
    /pinned Node/,
  );
  assert.throws(
    () => checkVersions(baseline, { ...runtime, miseVersion: "2020.1.1" }),
    /mise is below/,
  );
});

test("accepts coordinated release and dependency bumps without changing independent protocol/HA versions", () => {
  const s = structuredClone(baseline);
  s.pkg.version = s.lock.version = s.lock.packages[""].version = "0.2.0-beta.1";
  s.pkg.dependencies.lit =
    s.lock.packages[""].dependencies.lit =
    s.lock.packages["node_modules/lit"].version =
    s.installed.lit =
      "3.4.0";
  assert.doesNotThrow(() => checkVersions(s, runtime));
});

test("a development Node update keeps the old minimum in the derived CI matrix", () => {
  const s = structuredClone(baseline);
  const newer = semver.inc(minimum, "minor");
  s.mise.tools.node = newer;
  assert.deepEqual(
    checkVersions(s, { ...runtime, nodeVersion: minimum }).node,
    [minimum, newer],
  );
  assert.doesNotThrow(() =>
    checkVersions(s, { ...runtime, nodeVersion: newer }),
  );
  assert.throws(
    () =>
      checkVersions(s, {
        ...runtime,
        nodeVersion: newer,
        ciNodeVersion: minimum,
      }),
    /matrix Node/,
  );
});

test("coherent toolchain/Spec Kit upgrades allow CI mise newer than the minimum", () => {
  const s = structuredClone(baseline);
  const nextSpecKit = semver.inc(s.specVersions[0], "minor");
  s.mise.tasks.specify.run = s.mise.tasks.specify.run.replace(
    `v${s.specVersions[0]}`,
    `v${nextSpecKit}`,
  );
  s.specVersions.fill(nextSpecKit);
  s.ci.jobs.lint.with["mise-version"] = semver.inc(s.mise.min_version, "minor");
  assert.doesNotThrow(() => checkVersions(s, runtime));
});
