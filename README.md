# NodeJS CS:GO Server API

API HTTP muy simple para servidores CS:GO o CS:2 con autenticación de token para evitar distribuir contraseñas RCON entre aplicaciones y tener que actualizar las listas de servidores.

## Requirements
  - Node 18+ or Docker
  
## Installation via Node
###### Please do not open issues if you have problems when installing directly with Node.

Install dependencies by running:
```bash
npm install
```

Transpile the source code with Babel:
```bash
npm run babel
```

Create `servers.json` file:
```bash
cp config/servers.json.example config/servers.json
```

Update `servers.json` with your information


Run (**make sure you have Node version 18+**)
```bash
npm run start
```

## Installation via Docker

Build Docker image
```bash
npm run build
```

Create `servers.json` file:
```bash
cp config/servers.json.example config/servers.json
```

Update `servers.json` with your information


Run 
```bash
npm run docker
```

## Usage

API specification is provided as an OpenAPI spec on `oas.yaml`
