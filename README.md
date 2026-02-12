# SwapRide-backend


## Architecture
See [docs/architecture.md](docs/architecture.md) for clean architecture layers, folder structure, testing strategy, and Docker guidance.


## Clean Architecture Overview
This project is organized into clear layers so domain logic remains independent from framework and delivery concerns.

### Layers
- Domain
- Application
- Infrastructure
- Interfaces

### Folder Structure
See [docs/architecture.md](docs/architecture.md) for the structure and responsibilities of each layer.

### Quality
- Linting configured for code quality checks.
- Unit and integration tests scaffolded under 	ests/unit and 	ests/integration.
- Dockerfile included for reproducible runtime.

