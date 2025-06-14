# OCI Bastion and HeatWave MySQL Setup

This directory contains configuration and scripts for connecting to OCI HeatWave MySQL through a Bastion host.

## Prerequisites

1. OCI Always Free HeatWave MySQL instance running
2. OCI Bastion service configured
3. SSH key pair for Bastion authentication
4. Node.js installed locally

## Setup Instructions

### 1. Environment Configuration

Copy `.env.example` to `.env` and fill in your actual values:

```bash
cp .env.example .env
```

Required values to obtain from OCI Console:
- Bastion session ID
- HeatWave MySQL private IP address
- MySQL admin credentials
- SSH private key path

### 2. SSH Key Setup

Generate an SSH key pair if you haven't already:

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/oci_bastion_key
```

Add the public key to your Bastion session in OCI Console.

### 3. Connect to MySQL through Bastion

Use the provided script to establish connection:

```bash
./scripts/connect-mysql.sh
```

This will:
1. Create an SSH tunnel through Bastion
2. Forward MySQL port to localhost
3. Allow local MySQL client connections

### 4. Database Migration

Initialize the database schema:

```bash
node migrations/init-database.js
```

Migrate GeoJSON data to MySQL:

```bash
node migrations/geojson-to-mysql.js
```

## Directory Structure

```
oci/
├── .env.example        # Environment variables template
├── .env               # Your actual configuration (git-ignored)
├── README.md          # This file
├── config/            # Configuration files
├── scripts/           # Connection and utility scripts
└── migrations/        # Database migration scripts
```

## Security Notes

- Never commit `.env` file to git
- Keep SSH private keys secure
- Use strong MySQL passwords
- Regularly rotate Bastion sessions
- Monitor access logs in OCI Console