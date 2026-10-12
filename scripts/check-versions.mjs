import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import semver from "semver";
import { parse as toml } from "smol-toml";
import { parse as yaml } from "yaml";

export function readVersionSources(root = ".") {
  const read = (path) => readFileSync(resolve(root, path), "utf8");
  const json = (path) => JSON.parse(read(path));
  const pkg = json("package.json");
  return {
    pkg,
    lock: json("package-lock.json"),
    mise: toml(read(".mise.toml")),
    ci: yaml(read(".github/workflows/ci.yml")),
    ciText: read(".github/workflows/ci.yml"),
    hacs: json("hacs.json"),
    specVersions: [
      json(".specify/integration.json").version,
      json(".specify/init-options.json").speckit_version,
      ...["copilot", "speckit"].map(
        (name) => json(`.specify/integrations/${name}.manifest.json`).version,
      ),
    ],
    installed: Object.fromEntries(
      Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).map(
        (name) => [name, json(`node_modules/${name}/package.json`).version],
      ),
    ),
  };
}

function exact(value, label) {
  assert.ok(
    typeof value === "string" && semver.valid(value) === value,
    `${label}: use an exact SemVer pin`,
  );
  return value;
}

export function checkVersions(
  sources,
  { nodeVersion, miseVersion, ciNodeVersion },
) {
  const { pkg, lock, mise, ci, ciText, hacs, specVersions, installed } =
    sources;
  exact(pkg.version, "package.json version");
  assert.equal(
    lock.lockfileVersion,
    3,
    "Unsupported package-lock format; use npm to regenerate",
  );
  assert.equal(lock.name, pkg.name, "Lockfile package name drift");
  assert.equal(
    lock.version,
    pkg.version,
    "Lockfile release version drift; run npm install --package-lock-only",
  );
  for (const key of [
    "name",
    "version",
    "dependencies",
    "devDependencies",
    "engines",
  ]) {
    assert.deepEqual(
      lock.packages[""][key],
      pkg[key],
      `Lockfile root ${key} drift`,
    );
  }
  for (const [name, version] of Object.entries({
    ...pkg.dependencies,
    ...pkg.devDependencies,
  })) {
    exact(version, name);
    assert.equal(
      lock.packages[`node_modules/${name}`]?.version,
      version,
      `Locked ${name} drift`,
    );
    assert.equal(
      installed[name],
      version,
      `Installed ${name} drift; run npm ci`,
    );
  }
  const range = pkg.engines?.node;
  assert.ok(
    typeof range === "string" && semver.validRange(range),
    "Invalid Node engine range",
  );
  const minimum = semver.minVersion(range)?.version;
  assert.ok(minimum, "Node engine range has no supported minimum");
  exact(mise.tools.node, "mise Node");
  assert.ok(
    semver.satisfies(mise.tools.node, range),
    "mise Node is outside supported engines",
  );
  assert.ok(
    semver.satisfies(nodeVersion, range),
    "Installed Node is outside supported engines",
  );
  assert.ok(
    [minimum, mise.tools.node].includes(nodeVersion),
    "Run the pinned Node or declared CI minimum through mise",
  );
  if (ciNodeVersion)
    assert.equal(
      nodeVersion,
      ciNodeVersion,
      "CI is not running its declared matrix Node",
    );
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (path && entry.engines?.node) {
      assert.ok(
        semver.subset(range, entry.engines.node),
        `${path}: declared Node support exceeds dependency engines ${entry.engines.node}`,
      );
    }
  }
  for (const [tool, version] of Object.entries(mise.tools))
    exact(version, `mise ${tool}`);
  exact(mise.min_version, "mise minimum");
  assert.ok(
    semver.gte(exact(miseVersion, "Installed mise"), mise.min_version),
    "Installed mise is below minimum",
  );
  const ciMise = [];
  for (const job of Object.values(ci.jobs)) {
    if (job.with?.["mise-version"]) ciMise.push(job.with["mise-version"]);
    for (const step of job.steps ?? []) {
      if (step.uses?.startsWith("jdx/mise-action@"))
        ciMise.push(step.with?.version);
    }
  }
  assert.ok(ciMise.length, "CI must install pinned mise");
  for (const version of ciMise) {
    assert.ok(
      semver.gte(exact(version, "CI mise"), mise.min_version),
      "CI mise is below minimum",
    );
  }
  const refs = ciText
    .split("\n")
    .filter((line) => /^\s*(?:-\s*)?uses:/.test(line));
  for (const ref of refs) {
    assert.match(
      ref,
      /@[a-f0-9]{40} # v\d+\.\d+\.\d+\s*$/,
      "Action/workflow refs need a SHA and updateable version comment",
    );
  }
  const specKit = mise.tasks.specify.run.match(
    /github\/spec-kit\.git@v(\S+) specify$/,
  )?.[1];
  exact(specKit, "Spec Kit source tag");
  for (const version of specVersions)
    assert.equal(
      version,
      specKit,
      "Spec Kit installed/template provenance drift; upgrade with Specify CLI",
    );
  assert.equal(
    hacs.homeassistant,
    undefined,
    "An HA minimum claim requires an exact minimum-runtime test; the current HA E2E pin is only a tested target",
  );
  assert.equal(hacs.filename, `${pkg.name}.js`, "HACS resource filename drift");
  return { node: [...new Set([minimum, mise.tools.node])] };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const miseVersion = execFileSync("mise", ["--version"], {
    encoding: "utf8",
  }).split(" ")[0];
  const matrix = checkVersions(readVersionSources(), {
    nodeVersion: process.versions.node,
    miseVersion,
    ciNodeVersion: process.env.OVAPI_CI_NODE,
  });
  console.log(
    process.argv.includes("--matrix")
      ? JSON.stringify(matrix)
      : "Version relationships verified (release, lock, runtime, toolchain, Spec Kit and CI)",
  );
}
