"""
SSH remote execution utility for ObschiySbor server.
Usage: python ssh_run.py "command"
"""
import sys
import paramiko

HOST = '89.111.154.208'
USER = 'root'
PASS = 'qUsqBAtczENM67FT'

def run(cmd, timeout=30):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=10)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    client.close()
    if out:
        sys.stdout.buffer.write(out.encode('utf-8', errors='replace'))
    if err:
        sys.stderr.buffer.write(err.encode('utf-8', errors='replace'))
    return code

if __name__ == '__main__':
    cmd = ' '.join(sys.argv[1:]) if len(sys.argv) > 1 else 'echo ok'
    sys.exit(run(cmd))
