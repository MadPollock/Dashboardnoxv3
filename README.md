# Dashboard Application Shell

  This is a code bundle for Dashboard Application Shell. The original project is available at https://www.figma.com/design/HVYWrFxaeaoLrc82PhiIgz/Dashboard-Application-Shell.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Environment Configuration

  Environment variables are set in the `.env` file at the project root.

  ### Quick Start (Preview Mode)

  For local preview without Auth0:

  ```bash
  cp .env.example .env
  # The default .env already has VITE_ENABLE_MOCK_AUTH=true
  npm run dev
  ```

  ### Previewing with mock authentication

  Set `VITE_ENABLE_MOCK_AUTH=true` in your `.env` file to bypass Auth0 and use a local preview user. This is useful for closed previews where Auth0 credentials are not available and will not affect production builds.

  **Mock user details:**
  - Name: Preview User
  - Email: preview.user@example.com
  - Role: admin
  - Access token: `mock-access-token`

  ### Production Setup

  For production with real Auth0:

  1. Copy `.env.example` to `.env`
  2. Set `VITE_ENABLE_MOCK_AUTH=false`
  3. Configure your Auth0 credentials:
     - `VITE_AUTH0_DOMAIN`
     - `VITE_AUTH0_CLIENT_ID`
     - `VITE_AUTH0_AUDIENCE`
  4. Configure API endpoints:
     - `VITE_API_BASE_URL`
     - `VITE_READ_API_URL`
     - `VITE_COMMAND_API_URL`
  5. Restart the dev server

  ## Available Environment Variables

  See `.env.example` for all available configuration options.

  - **VITE_ENABLE_MOCK_AUTH** - Enable/disable mock authentication
  - **VITE_AUTH0_DOMAIN** - Auth0 tenant domain
  - **VITE_AUTH0_CLIENT_ID** - Auth0 application client ID
  - **VITE_AUTH0_AUDIENCE** - Auth0 API identifier
  - **VITE_API_BASE_URL** - Base URL for API calls
  - **VITE_READ_API_URL** - Read model API endpoint
  - **VITE_COMMAND_API_URL** - Command API endpoint
  - **VITE_APP_LOCALE** - UI language (en, pt, es)