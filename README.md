# Full-Stack Todo Application

This is a modern, full-stack web application featuring a React frontend, a .NET backend with real-time capabilities using SignalR, and a PostgreSQL database.

The application is designed to be containerized and deployed to Kubernetes using a GitOps workflow.

## Architecture

The project is structured as a multi-container application with three primary services:

1.  **`frontend/`**: A React (Vite) single-page application that provides the user interface. It is served by a lightweight NGINX web server. The frontend is built to be environment-agnostic, making relative API calls to the backend.

2.  **`backend/`**: A .NET API that handles business logic, data persistence, and real-time updates. It exposes a REST API for CRUD operations and a SignalR hub (`/todohub`) to broadcast changes to all connected clients.

3.  **Database**: A PostgreSQL database that persists the application's state.

## Local Development Setup

The entire application stack can be run locally using Docker Compose.

### Prerequisites

*   Docker
*   Docker Compose

### Running the Application

1.  **Clone the repository**.

2.  **Create a Local Environment File**:
    Create a file named `.env` in the root of this repository. This file is used by `docker-compose.yml` to configure local secrets and is ignored by Git (as defined in `.gitignore`).

    **File: `.env`**
    ```
    POSTGRES_USER=admin
    POSTGRES_PASSWORD=your_secure_local_password
    POSTGRES_DB=todos
    ```

3.  **Build and run the containers:**
    From the root of the repository, run the following command:
    ```bash
    docker-compose up --build
    ```
    This will build the Docker images for the frontend and backend, pull the PostgreSQL image, and start all three services.

4.  **Access the application:**
    *   **Frontend UI**: http://localhost:5173
    *   **Backend API (for testing)**: http://localhost:5013
    *   **PostgreSQL Database**: Connect on `localhost:5432` (Credentials are set in your `.env` file)

### Changing Database Credentials

The PostgreSQL container only uses the `POSTGRES_PASSWORD` from the `.env` file on its very first run to initialize the database. The password is then stored in the persistent `postgres-data` volume. If you change the password in `.env`, you must reset the database by running:
```bash
docker-compose down -v
```
Then, you can run `docker-compose up --build` again to re-initialize the database with the new credentials.

### Local NGINX Proxy Configuration

For local development, the frontend's NGINX server is configured to act as a reverse proxy. The configuration file (`frontend/nginx.conf`) contains rules that forward any API requests (e.g., to `/todos` or `/todohub`) from the frontend to the backend `api` container.

This is necessary because the browser can only make requests to the origin it was served from (`http://localhost:5173`). The proxy allows us to use relative paths in our frontend code, just like in production.

**Why This Doesn't Interfere with Kubernetes**

In a Kubernetes deployment, an `Ingress` resource intercepts all incoming traffic. It routes requests for API paths directly to the backend service *before* they ever reach the frontend pod. This means the proxy configuration inside the frontend container's `nginx.conf` is simply never used in the Kubernetes environment, making the same Docker image perfectly suitable for both local development and production.

## CI/CD and Deployment

This repository is configured with GitHub Actions to automate the building and publishing of Docker images.

### Workflows

*   **`frontend-image.yml`**: This workflow triggers on pushes to the `main` branch or on new version tags (e.g., `v1.0.0`). It builds the frontend Docker image and pushes it to the GitHub Container Registry (GHCR).

*   **`backend-image.yml`**: This workflow triggers on the same events. It builds the .NET backend Docker image and pushes it to GHCR.

### Deployment to Kubernetes

The actual deployment of this application to a Kubernetes cluster is managed by a separate GitOps repository. That repository consumes the Docker images built by the CI/CD pipelines in this repository.

The GitOps repository defines the Kubernetes manifests (Deployments, Services, Ingress, etc.) required to run this application, pulling the container images from GHCR based on their tags.

## Configuration

### Backend

The backend configuration is managed through environment variables, allowing it to be portable across different environments (local, dev, prod).

*   `ConnectionStrings__TodosDb`: The connection string for the PostgreSQL database. In `docker-compose.yml`, this points to the `db` service. In Kubernetes, it points to the internal database service.
*   `FrontendOrigin`: The URL of the frontend application, used for configuring a secure CORS policy. This is set to `http://localhost:5173` for local development and is injected with the public URL (e.g., `https://todo-app-dev.serit.dev`) in the Kubernetes deployment.

### Frontend

The frontend is designed to be **environment-agnostic**. It does not require any build-time environment variables.

*   **API Communication**: All API calls (e.g., to `/todos`) and SignalR connections (to `/todohub`) are made using **relative paths**. The browser automatically resolves these paths against the host from which the application was served.

*   **Routing**: In a Kubernetes environment, an Ingress Controller is responsible for routing traffic. It directs requests for the root path (`/`) to the frontend service and requests for API paths (`/todos`, `/todohub`) to the backend service. This architecture eliminates the need for hardcoded URLs and complex CORS configurations.