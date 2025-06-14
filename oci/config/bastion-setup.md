# OCI Bastion Setup Guide

## Prerequisites in OCI Console

1. **Create Bastion Service**
   - Navigate to Identity & Security → Bastion
   - Create Bastion in the same VCN as your HeatWave MySQL
   - Select the appropriate subnet (usually private subnet)
   - Enable Bastion plugin (recommended)

2. **Create Bastion Session**
   - Session type: Managed SSH session
   - Session name: `heatwave-mysql-tunnel`
   - Username: Generate a session-specific username
   - Target resource: 
     - Type: IP Address
     - IP: Your HeatWave MySQL endpoint IP (e.g., 10.0.1.3)
     - Port: 3306
   - Key type: Generate SSH key pair or provide public key

3. **Configure Security Lists**
   - Bastion subnet security list:
     - Ingress: Allow SSH (port 22) from your IP
     - Egress: Allow all traffic to VCN CIDR
   - MySQL subnet security list:
     - Ingress: Allow MySQL (port 3306) from Bastion subnet CIDR

## Local Setup

1. **Save SSH Private Key**
   ```bash
   # Save the private key from OCI Console
   mkdir -p ~/.ssh
   nano ~/.ssh/oci_bastion_key
   # Paste private key content
   chmod 600 ~/.ssh/oci_bastion_key
   ```

2. **Get Connection Details from OCI Console**
   - Bastion session OCID
   - SSH connection command (provided in session details)
   - MySQL private IP address

3. **Update .env File**
   ```bash
   cd oci
   cp .env.example .env
   nano .env
   ```

   Fill in:
   - `OCI_BASTION_SESSION_ID`: From session details
   - `OCI_BASTION_HOST`: From SSH command
   - `OCI_BASTION_USERNAME`: From SSH command
   - `MYSQL_HOST`: HeatWave MySQL private IP
   - `MYSQL_PASSWORD`: Your MySQL admin password

## Testing Connection

1. **Test SSH Tunnel**
   ```bash
   cd oci
   ./scripts/connect-mysql.sh
   ```

2. **In Another Terminal, Test MySQL**
   ```bash
   npm install
   npm run test-connection
   ```

## Troubleshooting

### SSH Connection Fails
- Verify Bastion session is ACTIVE
- Check SSH key permissions (600)
- Ensure your IP is allowed in security lists
- Try regenerating the session

### MySQL Connection Fails
- Verify tunnel is running (check first terminal)
- Check MySQL is running in OCI Console
- Verify MySQL credentials
- Check security list allows Bastion → MySQL

### Port Already in Use
- Change `LOCAL_MYSQL_PORT` in .env
- Or kill existing process: `lsof -ti:3307 | xargs kill`