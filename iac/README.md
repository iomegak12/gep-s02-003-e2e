# GEP-003-E2E — Azure VM Deployment (Terraform)

Single-VM Azure deployment that runs the full `docker-compose.prod.yml` stack
(front-end, back-end services, Postgres, MongoDB, CloudBeaver, Mongo Express)
on a Linux VM provisioned by Terraform.

## Folder layout

```
iac/
├── versions.tf, providers.tf, variables.tf, terraform.tfvars
├── main.tf          # composes the three modules + RG + IP detection
├── outputs.tf
├── keys/            # generated SSH key pair (gitignored)
└── modules/
    ├── networking/  # VNet, subnet, public IP, NSG (SSH + app ports)
    ├── ssh/         # tls_private_key + local_file + icacls hardening
    └── compute/     # cloud-init renderer + NIC + Linux VM
        └── cloud-init.yaml.tftpl
```

## What gets created

- Resource group `rg-gep003-<suffix>-westus`
- VNet `10.20.0.0/16`, subnet `10.20.1.0/24`
- Static Standard Public IP (with DNS label)
- NSG opening:
  - **22** — only from your detected public IP (auto-fetched via `https://api.ipify.org`)
  - **8080** — front-end web (nginx)
  - **3001 / 3002 / 3003** — IAM / Supplier / PO APIs
  - **8978** — CloudBeaver (Postgres web admin)
  - **8081** — Mongo Express (Mongo web admin)
- Ubuntu 22.04 LTS VM, `Standard_D4s_v5` (4 vCPU / 16 GB RAM), 64 GB Premium SSD
- Docker CE + compose plugin installed by cloud-init
- `docker-compose.prod.yml` embedded into the VM and started as a `systemd` service (`gep-stack.service`)
- 4096-bit RSA SSH key pair generated locally in `keys/`, with `icacls` hardening so only the **current Windows user** has read access to the private key

## Prerequisites

1. **Azure CLI** logged in:
   ```pwsh
   az login
   az account set --subscription "<your-subscription-id>"
   ```
   Terraform reuses the Azure CLI session — no secrets are stored in `.tf` files.
2. **Terraform ≥ 1.9** on PATH.
3. Windows PowerShell / pwsh (used by the `icacls` provisioner).

## Usage

```pwsh
cd iac
terraform init
terraform plan
terraform apply -auto-approve
```

After ~3–6 minutes (image install + Docker pulls), Terraform prints outputs including:

- `ssh_command` — copy/paste to SSH in
- `web_url`, `iam_api_url`, `supplier_api_url`, `po_api_url`
- `cloudbeaver_url`, `mongo_express_url`

The compose stack continues converging on the VM after Terraform exits.
Check progress with:

```pwsh
ssh -i keys/id_rsa azureuser@<public_ip>
sudo cloud-init status --wait
sudo docker ps
sudo systemctl status gep-stack
```

## Tear down

```pwsh
terraform destroy -auto-approve
```

The local `keys/` folder is **not** deleted — remove it manually if desired.

## Notes / limitations

- This is a **demo / PoC** deployment — single VM, hardcoded credentials inherited from `docker-compose.prod.yml`, no TLS, no backups.
- The front-end maps host port **8080 → container 80** (per the compose file), so the web URL uses `:8080`.
- Your public IP is re-detected on every `terraform plan/apply`. If your IP changes, re-apply to update the SSH NSG rule.
- The compose file is embedded into cloud-init as base64 at apply time. Edit `../docker-compose.prod.yml` and re-apply to push changes (Terraform will replace the VM's `custom_data`, which triggers VM replacement — destroying volumes).
