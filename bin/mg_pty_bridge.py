#!/usr/bin/env python3

import os
import pty
import select
import sys


def main() -> int:
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: mg_pty_bridge.py <command> [args...]\n")
        sys.stderr.flush()
        return 2

    argv = sys.argv[1:]
    stdin_fd = sys.stdin.fileno()
    stdout_fd = sys.stdout.fileno()
    pid, master_fd = pty.fork()
    if pid == 0:
        os.execvpe(argv[0], argv, os.environ)

    os.set_blocking(master_fd, False)
    os.set_blocking(stdin_fd, False)

    stdin_open = True

    try:
        while True:
            read_fds = [master_fd]
            if stdin_open:
                read_fds.append(stdin_fd)

            readable, _, _ = select.select(read_fds, [], [], 0.1)

            if master_fd in readable:
                try:
                    data = os.read(master_fd, 4096)
                except OSError:
                    data = b""
                if data:
                    os.write(stdout_fd, data)
                else:
                    break

            if stdin_open and stdin_fd in readable:
                try:
                    data = os.read(stdin_fd, 4096)
                except OSError:
                    data = b""
                if data:
                    os.write(master_fd, data)
                else:
                    stdin_open = False

            done_pid, status = os.waitpid(pid, os.WNOHANG)
            if done_pid == pid:
                if os.WIFEXITED(status):
                    return os.WEXITSTATUS(status)
                if os.WIFSIGNALED(status):
                    return 128 + os.WTERMSIG(status)
                return 1
    finally:
        try:
            os.close(master_fd)
        except OSError:
            pass

    _, status = os.waitpid(pid, 0)
    if os.WIFEXITED(status):
        return os.WEXITSTATUS(status)
    if os.WIFSIGNALED(status):
        return 128 + os.WTERMSIG(status)
    return 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except FileNotFoundError as error:
        sys.stderr.write(f"{error}\n")
        sys.stderr.flush()
        raise SystemExit(127)
