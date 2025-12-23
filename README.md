# StreamSnap

Screen recording application built with Electron.

## Installation

### Development Setup

1. Clone the repository:

```bash
git clone https://github.com/lef-adhoc/streamsnap.git
cd streamsnap
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your Google Drive API credentials
```

4. Run in development mode:

```bash
npm run dev
```

### Building for Production

Build for your current platform:

```bash
npm run build
```

Build for all platforms:

```bash
npm run dist:all
```

## Configuration

### Google Drive Integration

To enable Google Drive integration, you'll need to:

1. Create a project in the Google Cloud Console
2. Enable the Google Drive API
3. Create OAuth 2.0 credentials
4. Add your credentials to the `.env` file

### Environment Variables

- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### Development Commands

- `npm run dev` - Start development server
- `npm run build:css` - Build Tailwind CSS
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
