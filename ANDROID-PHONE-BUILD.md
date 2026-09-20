# Build and install the Android APK using only your phone

This project is prepared for Capacitor and includes a GitHub Actions workflow that builds an installable debug APK in the cloud.

## Phone-only method

1. Create/sign in to a GitHub account in Chrome.
2. Create a new repository.
3. Upload the contents of this project ZIP to the repository. Keep the `.github/workflows/android-apk.yml` file.
4. Open the repository's **Actions** tab.
5. Open **Build Android APK** and tap **Run workflow** (or push to `main`, which starts it automatically).
6. Wait for the workflow to finish.
7. Open the completed workflow run and scroll to **Artifacts**.
8. Download `tower-defense-debug-apk`.
9. Extract the downloaded ZIP and open `app-debug.apk`.
10. Android may ask you to allow Chrome/Files to install unknown apps. Allow it for that installation and install the APK.

The app is configured as:
- App name: Tower Defense
- Package ID: com.marinpaunovic.towerdefense
- Capacitor Android
- Dark splash screen
- No mixed-content access
- Production web build packaged locally inside the APK
