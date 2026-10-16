/**
 * Architecture boundaries for Money Lens. Run with `pnpm check:deps`.
 *
 *   frontend/src/pages/    screens
 *   frontend/src/api/      talks to the backend (no React)
 *   backend/src/routes/    talks to the browser (HTTP)
 *   backend/src/domain/    the rules: plain TypeScript, no HTTP, no database
 *   backend/src/db/        talks to Postgres
 *
 * Only folders that exist today have rules. When `shared/` or
 * `frontend/src/components/` appear, add their rules in the same commit.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular imports make code hard to reason about and test.",
      from: {},
      to: { circular: true },
    },
    {
      name: "frontend-not-backend",
      severity: "error",
      comment: "The browser app must not import server code. It talks to the backend over HTTP only.",
      from: { path: "^frontend/" },
      to: { path: "^backend/" },
    },
    {
      name: "backend-not-frontend",
      severity: "error",
      comment: "The server must not import UI code.",
      from: { path: "^backend/" },
      to: { path: "^frontend/" },
    },
    {
      name: "api-not-pages",
      severity: "error",
      comment: "Dependency goes pages -> api, never the other way round.",
      from: { path: "^frontend/src/api/" },
      to: { path: "^frontend/src/pages/" },
    },
    {
      name: "api-no-react",
      severity: "error",
      comment: "frontend/src/api only talks to the backend; keep it free of UI code.",
      from: { path: "^frontend/src/api/", pathNot: "\\.test\\.ts$" },
      to: { path: "node_modules/(react|react-dom)/" },
    },
    {
      name: "domain-is-pure",
      severity: "error",
      comment:
        "Business rules must not know about HTTP or the database, so they can be tested without either.",
      from: { path: "^backend/src/domain/", pathNot: "\\.test\\.ts$" },
      to: {
        path: [
          "^backend/src/(routes|db)/",
          "^backend/src/(app|index)\\.ts$",
          "^backend/src/generated/",
        ],
      },
    },
    {
      name: "domain-no-io-packages",
      severity: "error",
      comment: "Domain code must not import web-server or database packages.",
      from: { path: "^backend/src/domain/", pathNot: "\\.test\\.ts$" },
      to: { path: "node_modules/(express|@prisma/[^/]+|prisma|pg)/" },
    },
    {
      name: "db-not-routes",
      severity: "error",
      comment: "The database layer must not depend on the HTTP layer.",
      from: { path: "^backend/src/db/" },
      to: { path: "^backend/src/routes/" },
    },
    {
      name: "routes-not-generated-prisma",
      severity: "error",
      comment: "Routes reach the database through backend/src/db, never straight to Prisma.",
      from: { path: "^backend/src/routes/", pathNot: "\\.test\\.ts$" },
      to: { path: ["^backend/src/generated/", "node_modules/(@prisma/[^/]+|prisma)/"] },
    },
    {
      name: "not-to-test",
      severity: "error",
      comment: "Production code must not import test files.",
      from: { pathNot: "\\.test\\.tsx?$" },
      to: { path: "\\.test\\.tsx?$" },
    },
  ],
  options: {
    doNotFollow: { path: "(node_modules|^backend/src/generated)" },
    exclude: { path: "(^|/)(dist|build)/" },
    tsConfig: { fileName: "tsconfig.depcruise.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
      mainFields: ["module", "main", "types", "typings"],
    },
  },
};
