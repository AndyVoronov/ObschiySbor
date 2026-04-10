import paramiko
import sys

HOST = '89.111.154.208'
USER = 'root'
PASS = 'qUsqBAtczENM67FT'

def upload_file(local_path, remote_path):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=15)
    # Ensure remote dir exists
    ssh = client.invoke_shell()
    ssh.send(f"mkdir -p {remote_path.rsplit('/', 1)[0]}\n")
    import time; time.sleep(1)
    sftp = client.open_sftp()
    sftp.put(local_path, remote_path)
    sftp.close()
    client.close()

if __name__ == '__main__':
    upload_file(sys.argv[1], sys.argv[2])
    print(f"Uploaded {sys.argv[1]} -> {sys.argv[2]}")
