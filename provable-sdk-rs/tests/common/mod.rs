use std::sync::{Mutex, OnceLock};

use provable_sdk::set_kayros_host;

static LIVE_TEST_MUTEX: OnceLock<Mutex<()>> = OnceLock::new();

pub fn lock() -> std::sync::MutexGuard<'static, ()> {
    LIVE_TEST_MUTEX
        .get_or_init(|| Mutex::new(()))
        .lock()
        .expect("live test mutex")
}

pub fn configure_host() {
    if let Ok(host) = std::env::var("KAYROS_HOST") {
        if !host.trim().is_empty() {
            set_kayros_host(host);
        }
    }
}
