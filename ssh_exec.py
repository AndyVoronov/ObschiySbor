import paramiko
import sys
import time

def ssh_run(cmd, timeout=120):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('82.38.60.192', username='root', password='ZnpWerg8-4', timeout=10)
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    
    transport = ssh.get_transport()
    channel = transport.open_session()
    channel.settimeout(timeout)
    channel.exec_command(cmd)
    
    out_chunks = []
    err_chunks = []
    while True:
        if channel.recv_ready():
            out_chunks.append(channel.recv(4096).decode('utf-8', errors='replace'))
        if channel.recv_stderr_ready():
            err_chunks.append(channel.recv_stderr(4096).decode('utf-8', errors='replace'))
        if channel.exit_status_ready():
            while channel.recv_ready():
                out_chunks.append(channel.recv(4096).decode('utf-8', errors='replace'))
            while channel.recv_stderr_ready():
                err_chunks.append(channel.recv_stderr(4096).decode('utf-8', errors='replace'))
            break
        time.sleep(0.1)
    
    out = ''.join(out_chunks)
    err = ''.join(err_chunks)
    exit_code = channel.recv_exit_status()
    channel.close()
    ssh.close()
    if out: print(out)
    if err: print("STDERR:", err)
    return exit_code

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'hostname'
    t = int(sys.argv[2]) if len(sys.argv) > 2 else 120
    code = ssh_run(cmd, t)
    print(f"EXIT CODE: {code}")
