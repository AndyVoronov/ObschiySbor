import paramiko
import sys
import time

HOST = '89.111.154.208'
USER = 'root'
PASS = 'qUsqBAtczENM67FT'

def run_async(cmd, timeout=600):
    """Run command and stream output."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=15)
    
    transport = client.get_transport()
    channel = transport.open_session()
    channel.settimeout(timeout)
    channel.exec_command(cmd)
    
    output = []
    while True:
        if channel.recv_ready():
            data = channel.recv(4096).decode('utf-8', errors='replace')
            sys.stdout.buffer.write(data.encode('utf-8', errors='replace'))
            sys.stdout.buffer.flush()
            output.append(data)
        if channel.recv_stderr_ready():
            data = channel.recv_stderr(4096).decode('utf-8', errors='replace')
            sys.stderr.buffer.write(data.encode('utf-8', errors='replace'))
            sys.stderr.buffer.flush()
            output.append(data)
        if channel.exit_status_ready():
            break
        time.sleep(0.1)
    
    exit_code = channel.recv_exit_status()
    client.close()
    return exit_code, ''.join(output)

if __name__ == '__main__':
    cmd = ' '.join(sys.argv[1:]) if len(sys.argv) > 1 else 'echo ok'
    code, _ = run_async(cmd)
    sys.exit(code)
