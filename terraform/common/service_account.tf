resource "google_service_account" "notifications_api" {
  project      = data.terraform_remote_state.holi_infra_state.outputs.shared_project_id
  account_id   = "cloudrun-service-notifications-api"
  display_name = "Notifications API service account for Cloud Run"
}

resource "google_project_iam_member" "notifications_api" {
  for_each = toset([
    "roles/secretmanager.secretAccessor",
  ])
  project = data.terraform_remote_state.holi_infra_state.outputs.shared_project_id
  member  = "serviceAccount:${google_service_account.notifications_api.email}"
  role    = each.key
}

output "cloud_run_service_account_email" {
  value = google_service_account.notifications_api.email
}
