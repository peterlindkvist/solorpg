# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a solo adventure game engine that allows creating interactive fiction games using markdown. The project consists of:

- **Frontend**: React/TypeScript web client using Vite
- **Backend**: Node.js server using Google Cloud Functions Framework
- **Game Engine**: Markdown parser that supports game mechanics (state, actions, dice rolls, conditions)

## Architecture

### Directory Structure
- `clients/web/` - React frontend application
- `server/` - Backend services and API endpoints  
- `server/services/` - Core services (assets, storage, static files)
- `server.js` - Main server entry point

### Key Components
- **Game Engine**: Parses markdown with custom syntax for interactive fiction
- **Markdown Parser**: Located in `clients/web/src/utils/markdownUtils/`
- **Game State Management**: Handles variables, dice rolls, and conditional content
- **AI Integration**: OpenAI integration for text rewriting and image generation

## Development Commands

### Root Level
- `yarn start` - Start both server and web client in development mode
- `yarn server` - Run server only (Google Cloud Functions Framework)
- `yarn web` - Run web client only (Vite dev server)
- `yarn build` - Build web client and copy to server/public
- `yarn test` - Run web client tests
- `yarn deploy` - Deploy to Google Cloud Functions
- `yarn release` - Build and deploy

### Web Client (`clients/web/`)
- `yarn dev` - Start Vite development server
- `yarn build` - Build for production (TypeScript compilation + Vite build)
- `yarn lint` - Run ESLint with TypeScript support
- `yarn test` - Run Jest tests

## Game Engine Syntax

The markdown parser supports special syntax for interactive fiction:
- **Links**: `[text](#section)` for navigation, `[text](/chapter#section)` for chapter links
- **State Variables**: `{variableName}` replaced with state values
- **Actions**: JSON code blocks that modify game state
- **Conditions**: Conditional content blocks with `{condition} { content }:{ else content }`
- **Dice Rolls**: `[d20]`, `[2d6k1]` etc. using dice-roller library

## Testing

Tests are located in `clients/web/src/utils/markdownUtils/` and cover the markdown parsing functionality. Run tests with `yarn test` from the web client directory.

## API Structure

Server endpoints:
- `GET /api/stories/{path}` - Fetch story content from Google Cloud Storage
- `PUT /api/stories/{path}` - Save story content
- `GET /api/images` - Generate images using OpenAI DALL-E
- Various other endpoints for text-to-speech, speech-to-text, etc.

## TypeScript Types

Core types are defined in `clients/web/src/types.ts` including:
- `Section`, `Part`, `Story` - Game content structure
- `State` - Game state management
- `Settings`, `Assistant` - Configuration types