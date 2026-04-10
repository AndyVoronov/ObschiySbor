"""
Deploy ObschiySbor to server via SFTP + SSH.
Usage: python deploy_to_server.py
"""
import paramiko
import os
import sys

HOST = '89.111.154.208'
USER = 'root'
PASS = 'qUsqBAtczENM67FT'
REMOTE_DIR = '/root/obschiysbor'

# Local paths
LOCAL_BACKEND = os.path.join(os.path.dirname(__file__), 'backend')
LOCAL_NGINX = os.path.join(os.path.dirname(__file__), 'deploy', 'nginx')
LOCAL_DIST = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')
LOCAL_COMPOSE = os.path.join(os.path.dirname(__file__), 'docker-compose.yml')

def upload_dir(sftp, local_dir, remote_dir):
    """Upload directory recursively."""
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"
        if os.path.isfile(local_path):
            print(f"  Uploading {item}...")
            sftp.put(local_path, remote_path)
        elif os.path.isdir(local_path):
            try:
                sftp.stat(remote_path)
            except FileNotFoundError:
                sftp.mkdir(remote_path)
            upload_dir(sftp, local_path, remote_path)

def run_ssh(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    if out:
        sys.stdout.buffer.write(out.encode('utf-8', errors='replace'))
    if err and code != 0:
        sys.stderr.buffer.write(err.encode('utf-8', errors='replace'))
    return code

def main():
    print("=== Connecting to server ===")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=15)
    sftp = ssh.open_sftp()

    print("=== Creating remote directories ===")
    run_ssh(ssh, f'mkdir -p {REMOTE_DIR}/backend/app/api {REMOTE_DIR}/backend/app/models {REMOTE_DIR}/backend/app/schemas {REMOTE_DIR}/backend/app/services {REMOTE_DIR}/backend/app/core {REMOTE_DIR}/backend/alembic/versions {REMOTE_DIR}/deploy/nginx {REMOTE_DIR}/frontend_dist')

    print("=== Uploading backend ===")
    upload_dir(sftp, LOCAL_BACKEND, f'{REMOTE_DIR}/backend')

    print("=== Uploading nginx config ===")
    upload_dir(sftp, LOCAL_NGINX, f'{REMOTE_DIR}/deploy/nginx')

    print("=== Uploading docker-compose.yml ===")
    sftp.put(LOCAL_COMPOSE, f'{REMOTE_DIR}/docker-compose.yml')

    print("=== Uploading frontend dist ===")
    try:
        sftp.stat(f'{REMOTE_DIR}/frontend_dist')
    except FileNotFoundError:
        sftp.mkdir(f'{REMOTE_DIR}/frontend_dist')
    upload_dir(sftp, LOCAL_DIST, f'{REMOTE_DIR}/frontend_dist')

    sftp.close()

    print("\n=== Building and starting containers ===")
    run_ssh(ssh, f'cd {REMOTE_DIR} && docker compose build backend 2>&1')
    run_ssh(ssh, f'cd {REMOTE_DIR} && docker compose up -d 2>&1')

    print("\n=== Waiting for services ===")
    import time
    time.sleep(10)

    print("\n=== Running database migrations ===")
    code = run_ssh(ssh, f'cd {REMOTE_DIR} && docker compose exec backend alembic upgrade head 2>&1')
    if code != 0:
        print("WARNING: Migration may have failed, checking...")

    print("\n=== Checking service status ===")
    run_ssh(ssh, f'cd {REMOTE_DIR} && docker compose ps 2>&1')
    run_ssh(ssh, f'curl -s http://localhost/api/health 2>&1')

    ssh.close()
    print("\n=== Deploy complete! ===")
    print(f"Server: http://{HOST}")

if __name__ == '__main__':
    main()
