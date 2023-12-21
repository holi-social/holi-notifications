locals {
  # effectively, this is notifications.apis.holi.social
  notifications_api_environments_zone_dns_name = "notifications.${data.terraform_remote_state.holi_infra_state.outputs.dns_apis_zone_domain}."
}

# notifications api environments zone
resource "google_dns_managed_zone" "notifications_api_environments_zone" {
  project  = data.terraform_remote_state.holi_infra_state.outputs.shared_project_id
  name     = "notifications-api-holi-social-environments-zone"
  dns_name = local.notifications_api_environments_zone_dns_name
}

resource "google_dns_record_set" "notifications_api_environments_zone_entry" {
  project = data.terraform_remote_state.holi_infra_state.outputs.shared_project_id
  name    = local.notifications_api_environments_zone_dns_name
  type    = "NS"
  ttl     = 300

  managed_zone = data.terraform_remote_state.holi_infra_state.outputs.dns_apis_zone_name

  rrdatas = google_dns_managed_zone.notifications_api_environments_zone.name_servers
}

output "dns_notifications_api_domain" {
  value = trim(google_dns_managed_zone.notifications_api_environments_zone.dns_name, ".")
}

output "dns_notifications_api_domain_name" {
  value = google_dns_managed_zone.notifications_api_environments_zone.name
}
