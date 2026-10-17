import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import semver from "semver";
import { parse as yaml } from "yaml";
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

test("CI runs the same jobs for pull requests and pushes to main", () => {
  assert.ok(Object.hasOwn(baseline.ci.on, "pull_request"));
  assert.deepEqual(baseline.ci.on.push.branches, ["main"]);
  for (const name of ["lint", "versions", "frontend"])
    assert.equal(baseline.ci.jobs[name].if, undefined);
});

for (const [label, valid] of [
  ["ubuntu-26.04", true],
  ["ubuntu-24.04", true],
  ["ubuntu-26.04-typo", false],
  ["ubuntu-99.04", false],
]) {
  test(`actionlint ${valid ? "accepts" : "rejects"} runner ${label}`, () => {
    const config = ".github/actionlint.yaml";
    assert.deepEqual(yaml(readFileSync(config, "utf8")), {
      "self-hosted-runner": { labels: ["ubuntu-26.04"] },
    });
    const result = spawnSync("actionlint", ["-config-file", config, "-"], {
      input: `on: push\njobs:\n  check:\n    runs-on: ${label}\n    steps:\n      - run: echo ok\n`,
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.ifError(result.error);
    const output = result.stdout + result.stderr;
    assert.equal(result.status, valid ? 0 : 1, output);
    if (!valid) {
      assert.ok(output.includes(`label "${label}" is unknown`), output);
      assert.ok(output.includes("[runner-label]"), output);
    }
  });
}

test("inherited Renovate regexes extract the mise minimum and all three CI pins", () => {
  // DevSecNinja/.github .renovate/customManagers.json5 at 9170d8c24e95a27dca91e1b7904f1f70a94dd1b0.
  const workflow =
    /# renovate: datasource=(?<datasource>\S+) depName=(?<depName>\S+)\n\s+[\w-]*version: "?(?<currentValue>[^\s"]+)"?/g;
  const minimum =
    /# renovate: datasource=github-releases depName=(?<depName>\S+)\nmin_version = "(?<currentValue>[^"]+)"/g;
  assert.deepEqual(
    [...baseline.ciText.matchAll(workflow)].map(({ groups }) => ({
      ...groups,
    })),
    Array.from({ length: 3 }, () => ({
      datasource: "github-releases",
      depName: "jdx/mise",
      currentValue: baseline.ci.jobs.lint.with["mise-version"],
    })),
  );
  assert.deepEqual(
    [...baseline.miseText.matchAll(minimum)].map(({ groups }) => ({
      ...groups,
    })),
    [{ depName: "jdx/mise", currentValue: baseline.mise.min_version }],
  );
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
    "unannotated mise minimum",
    (s) => {
      s.miseText = s.miseText.replace(
        "# renovate: datasource=github-releases depName=jdx/mise\n",
        "",
      );
    },
    /mise minimum needs.*Renovate annotation/,
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

for (const [index, name] of ["lint", "versions", "frontend"].entries()) {
  for (const [label, version, message] of [
    ["below minimum", "2020.1.1", /CI mise is below/],
    ["missing pin", undefined, /CI mise: use an exact SemVer pin/],
    ["inconsistent pin", "2099.1.1", /CI mise bootstrap pins drift/],
  ]) {
    test(`rejects ${name} mise ${label}`, () => {
      const s = structuredClone(baseline);
      const job = s.ci.jobs[name];
      const inputs =
        job.with ??
        job.steps.find((step) => step.uses?.startsWith("jdx/mise-action@"))
          .with;
      inputs[name === "lint" ? "mise-version" : "version"] = version;
      assert.throws(() => checkVersions(s, runtime), message);
    });
  }
  for (const [label, mutate] of [
    ["missing", () => ""],
    ["wrong dependency", (comment) => comment.replace("jdx/mise", "jdx/other")],
    ["not adjacent", (comment) => `${comment}\n`],
  ]) {
    test(`rejects ${name} mise annotation ${label}`, () => {
      const s = structuredClone(baseline);
      let current = 0;
      s.ciText = s.ciText.replace(
        /^[ \t]*# renovate: datasource=github-releases depName=jdx\/mise\n/gm,
        (comment) => (current++ === index ? mutate(comment) : comment),
      );
      s.ci = yaml(s.ciText);
      assert.throws(
        () => checkVersions(s, runtime),
        /CI mise needs.*Renovate annotation/,
      );
    });
  }
}

function setCiMise(sources, version) {
  sources.ciText = sources.ciText.replace(
    /(^[ \t]+(?:mise-)?version: ")[^"]+"/gm,
    (_match, prefix) => `${prefix}${version}"`,
  );
  sources.ci = yaml(sources.ciText);
}

test("accepts coordinated mise minimum and bootstrap updates", () => {
  const s = structuredClone(baseline);
  const newer = semver.inc(s.ci.jobs.lint.with["mise-version"], "minor");
  s.miseText = s.miseText.replace(s.mise.min_version, newer);
  s.mise.min_version = newer;
  setCiMise(s, newer);
  assert.doesNotThrow(() =>
    checkVersions(s, { ...runtime, miseVersion: newer }),
  );
});

test("rejects raising the mise minimum above unchanged CI bootstrap pins", () => {
  const s = structuredClone(baseline);
  const newer = semver.inc(s.ci.jobs.lint.with["mise-version"], "minor");
  s.miseText = s.miseText.replace(s.mise.min_version, newer);
  s.mise.min_version = newer;
  assert.throws(
    () => checkVersions(s, { ...runtime, miseVersion: newer }),
    /CI mise is below/,
  );
});

test("rejects wrong installed runtimes, including an unsupported newer Node", () => {
  for (const nodeVersion of [
    "20.0.0",
    semver.inc(baseline.mise.tools.node, "major"),
    "garbage",
  ]) {
    assert.throws(
      () => checkVersions(baseline, { ...runtime, nodeVersion }),
      /Installed Node/,
    );
  }
  assert.throws(
    () =>
      checkVersions(baseline, {
        ...runtime,
        nodeVersion: semver.inc(baseline.mise.tools.node, "patch"),
      }),
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
  setCiMise(s, semver.inc(s.mise.min_version, "minor"));
  assert.doesNotThrow(() => checkVersions(s, runtime));
});
