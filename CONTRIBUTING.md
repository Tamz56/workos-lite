# Contributing

## Requirements
- Node.js (LTS recommended)

## Setup
```bash
npm install
npm run dev
```

## Quality gates
```bash
npm run lint
npm run build
```

## Branch naming
- `feat/<scope>`
- `fix/<scope>`
- `chore/<scope>`
- `docs/<scope>`
- `refactor/<scope>`

## PR rules (main is protected)
1. Push to main is blocked
2. Open PR -> CI must pass (lint_build) -> merge
