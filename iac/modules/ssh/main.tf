resource "tls_private_key" "ssh" {
  algorithm = "RSA"
  rsa_bits  = var.rsa_bits
}

resource "local_sensitive_file" "private_key" {
  filename        = "${var.key_dir}/${var.key_name}"
  content         = tls_private_key.ssh.private_key_openssh
  file_permission = "0600"
}

resource "local_file" "public_key" {
  filename        = "${var.key_dir}/${var.key_name}.pub"
  content         = tls_private_key.ssh.public_key_openssh
  file_permission = "0644"
}

# Windows ACL hardening: only the current user gets Read on the private key.
resource "null_resource" "icacls_private_key" {
  triggers = {
    key_fingerprint = tls_private_key.ssh.public_key_fingerprint_sha256
    key_path        = local_sensitive_file.private_key.filename
  }

  provisioner "local-exec" {
    interpreter = ["PowerShell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]
    command     = <<-EOT
      $keyPath = "${local_sensitive_file.private_key.filename}"
      Write-Host "Securing $keyPath with icacls for current user only..."
      icacls $keyPath /inheritance:r | Out-Null
      icacls $keyPath /remove:g "Authenticated Users" "BUILTIN\Users" "Everyone" "NT AUTHORITY\Authenticated Users" 2>$null | Out-Null
      icacls $keyPath /grant:r "$($env:USERNAME):(R)" | Out-Null
      icacls $keyPath
    EOT
  }

  depends_on = [local_sensitive_file.private_key]
}
