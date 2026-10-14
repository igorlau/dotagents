# Install dotagents with a deploy key

Use a deploy key on machines where you can't use your personal GitHub
account, such as a company laptop signed in to an Enterprise Managed User
(EMU) account. A deploy key grants read-only access to the dotagents
repository and nothing else in your account.

Before you start, check that your company's policy allows SSH keys for
external repositories on the machine.

To set up the deploy key, follow these steps:

1. On the company machine, create a key pair without a passphrase:

    ```bash
    ssh-keygen -t ed25519 -N "" -C "dotagents deploy key" -f ~/.ssh/dotagents_deploy_key
    ```

1. Add the public key to the repository as a read-only deploy key. On a
   machine where the GitHub CLI is signed in to your personal account, run
   the following command:

    ```bash
    gh repo deploy-key add dotagents_deploy_key.pub --repo igorlau/dotagents --title "COMPUTER_NAME"
    ```

    Replace `COMPUTER_NAME` with a name that identifies the company machine.
    The key is read-only unless you pass `--allow-write`.

    Alternatively, in the repository settings on GitHub, go to
    **Deploy keys**, click **Add deploy key**, and leave
    **Allow write access** cleared.

1. On the company machine, add an SSH host alias to `~/.ssh/config`. The
   alias keeps this key separate from the key for your company account, and
   port 443 works on networks that block port 22:

    ```text
    Host github-dotagents
      HostName ssh.github.com
      Port 443
      User git
      IdentityFile ~/.ssh/dotagents_deploy_key
      IdentitiesOnly yes
    ```

1. Test the connection:

    ```bash
    ssh -T github-dotagents
    ```

    The output is similar to the following:

    ```text
    Hi igorlau/dotagents! You've successfully authenticated, but GitHub does not provide shell access.
    ```

1. Install dotagents, and record the source so that `self-update` uses the
   deploy key too:

    ```bash
    npx --yes git+ssh://git@github-dotagents/igorlau/dotagents.git install \
        --source git+ssh://git@github-dotagents/igorlau/dotagents.git
    ```

To revoke access, delete the key from **Deploy keys** in the repository
settings, and delete `~/.ssh/dotagents_deploy_key*` from the machine.

If SSH isn't available, download the `.tgz` file from the latest GitHub
release on another machine, copy it over, and run
`npx --yes ./dotagents-VERSION.tgz install`.
