# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.6.0](https://github.com/shawnphoffman/medstash/compare/v0.5.3...v0.6.0) (2026-04-11)

### Features

* **ui:** collapsible sidebar + Tailwind v4 / shadcn upgrade ([d01b696](https://github.com/shawnphoffman/medstash/commit/d01b69677fec2ae1ddf852fe6cc1828bc2289a8f))

## [0.5.3](https://github.com/shawnphoffman/medstash/compare/v0.5.2...v0.5.3) (2026-04-09)

## [0.5.2](https://github.com/shawnphoffman/medstash/compare/v0.5.1...v0.5.2) (2026-04-09)

### Documentation

* disclose AI assistance in development ([305aeb7](https://github.com/shawnphoffman/medstash/commit/305aeb71c4f79da7be27ff774b841596d8a61cf9))

## [0.5.1](https://github.com/shawnphoffman/medstash/compare/v0.5.0...v0.5.1) (2026-04-09)

### Bug Fixes

* **ci:** resolve release pipeline failures ([f055255](https://github.com/shawnphoffman/medstash/commit/f0552555fbc9ecd52bf0ca1fdd7d141acd974133))

# Changelog

## [0.5.0](https://github.com/shawnphoffman/medstash/compare/v0.4.0...v0.5.0) (2026-04-09)


### Features

* add AboutPage route and update versioning script to include version.ts ([c9851ec](https://github.com/shawnphoffman/medstash/commit/c9851ec7d493ff8deb0521f937504418bb43d5a1))
* add border color utility for Tailwind CSS in color picker ([6313f2e](https://github.com/shawnphoffman/medstash/commit/6313f2ee136a42701d1b3e5555868f6dc6b93139))
* add bulk update functionality for receipts ([6289987](https://github.com/shawnphoffman/medstash/commit/62899876425ea44971903b9003635356261e9f9c))
* add bulk upload functionality to the app ([7bfddf5](https://github.com/shawnphoffman/medstash/commit/7bfddf5d072ad332307671476d9fdecbdb7057a5))
* add camera functionality for file uploads in ReceiptDetailPage and UploadPage ([aebcf22](https://github.com/shawnphoffman/medstash/commit/aebcf220e808f214f6a35f573fa930e8d4dac5c7))
* add comprehensive input validation for receipt fields ([6121e80](https://github.com/shawnphoffman/medstash/commit/6121e808b1ae78f5b9912de48a4428962b438600))
* add database migration support and update test database setup ([004dba9](https://github.com/shawnphoffman/medstash/commit/004dba91efd3c5bda419a2046f7585905e3a6577))
* add delete functionality to BulkEditDialog for receipt management ([162df86](https://github.com/shawnphoffman/medstash/commit/162df86e7d5d47eeed82dd4e7fada274e81756a0))
* add dry-run preview for file rename and organize operations ([3b7efc6](https://github.com/shawnphoffman/medstash/commit/3b7efc6c666473c67c5397d5fa22ee81da9c86b8))
* add environment variable configuration and update documentation ([485d9a7](https://github.com/shawnphoffman/medstash/commit/485d9a754e279757987d8c141840d07fb3614921))
* add favicon and manifest links to index.html ([d634a26](https://github.com/shawnphoffman/medstash/commit/d634a268cef7163f1ecb137ef4e9886b7729363e))
* add frequent vendors feature to receipts API and frontend ([6c11b00](https://github.com/shawnphoffman/medstash/commit/6c11b003eb3d072e80e1386c70248a14277abfcf))
* add GitHub link to navigation ([c7c32a9](https://github.com/shawnphoffman/medstash/commit/c7c32a94d81408767163336bf75f41025b589b4e))
* add HelpCircle icon and About link to navigation ([8ca3bd1](https://github.com/shawnphoffman/medstash/commit/8ca3bd1946a1270fa94a7c0934d7ff32eeee2d28))
* add image optimization features and settings ([46f72ef](https://github.com/shawnphoffman/medstash/commit/46f72efa73b24d20e2204a8867708429ea293acf))
* add integrity manifest to receipt exports ([ac6b955](https://github.com/shawnphoffman/medstash/commit/ac6b955f9a98a0bfbeec8ff6bb0a65a4139c39a0))
* add receipt type groups route to test server ([a56286a](https://github.com/shawnphoffman/medstash/commit/a56286aaab201e0f2e110029f3dbccdd8e28def4))
* add reset receipt types to defaults functionality ([e0916a7](https://github.com/shawnphoffman/medstash/commit/e0916a7ccaa3a4ab86ef914ecc082cbe33020422))
* add reset to defaults functionality in SettingsPage ([0e0715f](https://github.com/shawnphoffman/medstash/commit/0e0715f3372fa6e71ae70d5e087f2fc9621b7ef0))
* add upload button to mobile navigation for improved accessibility ([96e62aa](https://github.com/shawnphoffman/medstash/commit/96e62aa61ab6ec3c3a1c379c9dfce7a97a8c6572))
* add version bumping script with git integration ([35f3e2a](https://github.com/shawnphoffman/medstash/commit/35f3e2a2d99e4952af8950faaaeba9713691bd6b))
* add watch folder functionality for auto-import of receipts ([5fa1a15](https://github.com/shawnphoffman/medstash/commit/5fa1a158cd159871583d9a30820cf8a4dcfb2f6a))
* **backend:** add data integrity check and repair endpoint ([df6c09b](https://github.com/shawnphoffman/medstash/commit/df6c09bead308206fcef210049f574ffd9c008c1))
* **backend:** add file operation audit logging ([69e4847](https://github.com/shawnphoffman/medstash/commit/69e48474d2897a7d07e733b38719ea397e15dae9))
* enhance API mocking and testing for frequent vendors ([34ce2ff](https://github.com/shawnphoffman/medstash/commit/34ce2ff9cfa5b4a41697cd45fdbc97222341d1c0))
* enhance bulk update functionality in receipts API and frontend ([9d522c2](https://github.com/shawnphoffman/medstash/commit/9d522c2f7d8e611f429d821ccdb5455541a5962b))
* enhance DatePicker component with input handling and date formatting ([f7afbf9](https://github.com/shawnphoffman/medstash/commit/f7afbf9b2ab86ef33bfbec81ce33713a61c8d7ba))
* enhance Dockerfile and backend static file handling ([40550f9](https://github.com/shawnphoffman/medstash/commit/40550f939053726b6fbb0bc57423d9792fee5eec))
* enhance drag-and-drop functionality in SettingsPage ([7e709ee](https://github.com/shawnphoffman/medstash/commit/7e709ee8407e14a011370a67ac3fe6e3a72295cf))
* enhance file handling in receipts API ([990bdb6](https://github.com/shawnphoffman/medstash/commit/990bdb6c274eb20c1d5801a8a2879279c0656a44))
* enhance filename pattern management in settings ([11bfbc1](https://github.com/shawnphoffman/medstash/commit/11bfbc124a343a0d91d91dd1b01a179dadf8d36e))
* enhance ReceiptDetailPage with navigation and data handling ([be8214d](https://github.com/shawnphoffman/medstash/commit/be8214d4a5c6c78417feb48d6c7834b236098826))
* enhance ReceiptsPage with development-only ID column visibility ([0511624](https://github.com/shawnphoffman/medstash/commit/0511624c5c30dd8fd5a747e90c7e62261ce791ed))
* enhance static file serving and SPA routing in backend and frontend ([0401b03](https://github.com/shawnphoffman/medstash/commit/0401b03d950e11d023f63d99922445a0e597567a))
* enhance UI with new select components and mobile navigation ([42dc554](https://github.com/shawnphoffman/medstash/commit/42dc554aa0bb42ef9c2763c3b973b04b1a5efefc))
* enhance UploadPage form with additional fields ([56d7196](https://github.com/shawnphoffman/medstash/commit/56d71964e8d14d33b7a3d52391cf66c47b115817))
* enhance watch service with new processed files management endpoints ([b2642ec](https://github.com/shawnphoffman/medstash/commit/b2642ec0ffb7fe13a7c7a45eaeecc492962d9486))
* enhance watch service with new routes and tests ([1550a8d](https://github.com/shawnphoffman/medstash/commit/1550a8d167776f020a67d084e1e6e1716866fa16))
* extract version from package.json in Docker build workflow ([7563ce1](https://github.com/shawnphoffman/medstash/commit/7563ce1a62d9de1a4491f4ba2be1c195a89d2096))
* **frontend:** add explicit confirmation for file deletion and replacement ([cbe8a8a](https://github.com/shawnphoffman/medstash/commit/cbe8a8a63d49577cd7cb8fedaa6f4083317baf53))
* **frontend:** add support dialog with PCTA and developer donation links ([cd663c9](https://github.com/shawnphoffman/medstash/commit/cd663c99440a64ada007d2712c279b1cf7970596))
* implement auto-refresh functionality in ReceiptsPage ([065ee33](https://github.com/shawnphoffman/medstash/commit/065ee33d4465077e33a1e2ea5a57e12d24df93af))
* implement bulk update for receipt types ([58b173b](https://github.com/shawnphoffman/medstash/commit/58b173beb968217fc2ca459b9c854977a54acbc3))
* implement code splitting and optimize bundle size ([3bd2084](https://github.com/shawnphoffman/medstash/commit/3bd208410a2f0c1f249ed835d095a99c7d8c5282))
* implement export functionality in SettingsPage and clean up ReceiptsPage ([f931972](https://github.com/shawnphoffman/medstash/commit/f9319729d26b5fef0ade5d07f870091c273a1d21))
* implement global API error handling and error page integration ([ac69c3a](https://github.com/shawnphoffman/medstash/commit/ac69c3a1d2ff0c22099d6a0ce9358ded564f47a6))
* implement migration of files to new user/date structure ([0511bf9](https://github.com/shawnphoffman/medstash/commit/0511bf9c18217b3cff4ef68e0d36cd734d520bfb))
* implement receipt type groups functionality ([9a6ba02](https://github.com/shawnphoffman/medstash/commit/9a6ba02753c55b84c495ca207ee7543847984944))
* implement user management functionality in SettingsPage ([dac29d0](https://github.com/shawnphoffman/medstash/commit/dac29d0166b49aa86be6b93491688bcd99ae9f25))
* integrate Radix UI Dialog component for enhanced modal functionality ([0c82e08](https://github.com/shawnphoffman/medstash/commit/0c82e08e75ec917f21968fa77e7b8557cc3ba384))
* show detailed error information for bulk file operations ([2f4a526](https://github.com/shawnphoffman/medstash/commit/2f4a5263124a14374cd8a10e1532e9ffea32506b))
* update Docker configuration and environment variable handling ([1cc22bf](https://github.com/shawnphoffman/medstash/commit/1cc22bfe5f1f4201feba105e0ff024c672eefa4c))
* update filename generation to include [pk-index] suffix for uniqueness ([2f5208c](https://github.com/shawnphoffman/medstash/commit/2f5208c0c30d1cce6b0f337a66eb6cd244bbf701))


### Bug Fixes

* adjust button visibility for camera capture on UploadPage ([956df81](https://github.com/shawnphoffman/medstash/commit/956df811153e495a0c38bf7020129f1f01095c53))
* adjust icon dimensions in Select component ([f85495d](https://github.com/shawnphoffman/medstash/commit/f85495d8419584a4f4669d268dceda2b72f2490d))
* allow test keys in setSetting validation for test mode ([8e5ccef](https://github.com/shawnphoffman/medstash/commit/8e5ccef447938860c6dda2e826451692cb17ae5f))
* **backend:** clean up partial state when receipt upload fails ([9d3b2e4](https://github.com/shawnphoffman/medstash/commit/9d3b2e445018936fc1b3db979e27b6768e831a26))
* **backend:** ensure consistent file path resolution after directory migration ([4e87ff4](https://github.com/shawnphoffman/medstash/commit/4e87ff4837bc97cc7741b47c3e7122e0f81d89f3))
* **backend:** mark images as optimized only after file replacement succeeds ([8d007f2](https://github.com/shawnphoffman/medstash/commit/8d007f226aa6d987f5a17567c5ea5cf278724362))
* **backend:** prevent data loss during file replacement ([69941b5](https://github.com/shawnphoffman/medstash/commit/69941b56519557bbad618e81b88e6db2755dbf72))
* **backend:** prevent database updates when file rename fails on disk ([3eec73b](https://github.com/shawnphoffman/medstash/commit/3eec73b738c337cd5d5c06052e37d39677a32619))
* **backend:** resolve orphaned files when deleting receipts ([becbb7e](https://github.com/shawnphoffman/medstash/commit/becbb7e685caca068de6eee36b0fa69943ce8d69))
* clean up JSX structure in App and SettingsPage components ([c2155ae](https://github.com/shawnphoffman/medstash/commit/c2155ae7fa623383782be2ee4059a29fee102805))
* enhance Navigation and SettingsPage components for improved functionality ([19e3a68](https://github.com/shawnphoffman/medstash/commit/19e3a68220a9c67e13af630c4763493bda644c4c))
* improve file path handling and enhance Content Security Policy ([a5a1b3b](https://github.com/shawnphoffman/medstash/commit/a5a1b3bf1e0d213506c1760ee4b58546120f6fd1))
* improve formatting of filename note in SettingsPage for better readability ([e20124d](https://github.com/shawnphoffman/medstash/commit/e20124d976ee1226d030480dac4107b629f77cb5))
* improve SettingsPage component structure and functionality ([88b0974](https://github.com/shawnphoffman/medstash/commit/88b0974a102011dd4699f347cdb62de061f5a803))
* simplify text in SettingsPage for clarity ([91aa386](https://github.com/shawnphoffman/medstash/commit/91aa386d50e198ab6b60a71fef68918dfabe19fb))
* update BulkEditDialog to handle 'None' selection correctly ([8af49e6](https://github.com/shawnphoffman/medstash/commit/8af49e6476d52630e9af0aeac9ffcf48f670119e))
* update Content Security Policy to allow connections from 127.0.0.1 ([dcc779d](https://github.com/shawnphoffman/medstash/commit/dcc779dbd5c4e2574736bade26ebae2132734c61))
* update Content Security Policy to allow frame sources ([b977a24](https://github.com/shawnphoffman/medstash/commit/b977a24d922deed8b73871e5c22f8d46eeea21f2))
* update insertReceiptType calls to include default parameters ([2f5bdda](https://github.com/shawnphoffman/medstash/commit/2f5bddad76f30c61b44c31621954946b3150711c))
* update logo in Navigation component and remove unused icon ([bfabef0](https://github.com/shawnphoffman/medstash/commit/bfabef04e57bd7b0108a319be7248503f35fd708))
* update package-lock.json and frontend build script ([f3d48ee](https://github.com/shawnphoffman/medstash/commit/f3d48ee07d10bd130d4b05de532de508a9807769))


### Code Refactoring

* add centralized error handling middleware ([d15501b](https://github.com/shawnphoffman/medstash/commit/d15501b8560f461e87b040f75faa20e606feb559))
* **backend:** wrap multi-step database operations in explicit transactions ([07bf9a5](https://github.com/shawnphoffman/medstash/commit/07bf9a55a749333625912b7831d804041f72f80d))
* clean up and optimize loadData function in ReceiptsPage ([26b586e](https://github.com/shawnphoffman/medstash/commit/26b586e24fc547ffeeaaa589bffb2ed7fcf8f35b))
* clean up ReceiptDetailPage and UploadPage components ([5b550fd](https://github.com/shawnphoffman/medstash/commit/5b550fd5481cfc9139ff20cf3681220410383cb8))
* enhance custom render function in test utilities ([143359e](https://github.com/shawnphoffman/medstash/commit/143359e1b779a085d5a184ebf049fbe60001357a))
* enhance layout responsiveness in ReceiptDetailPage ([8e5c912](https://github.com/shawnphoffman/medstash/commit/8e5c912d9e1dd722c45a17c155ebb3af2326d3e8))
* improve database initialization and migration logic ([d30a790](https://github.com/shawnphoffman/medstash/commit/d30a790a65acbad4dbe29e11a54bf3b7fbe1a49a))
* improve layout of export button in SettingsPage ([9207a9b](https://github.com/shawnphoffman/medstash/commit/9207a9b28dcff946425e5f2eb0e1025b9708e924))
* improve navigation and layout in ReceiptDetailPage ([02f471d](https://github.com/shawnphoffman/medstash/commit/02f471da652ad74a76f5e6566c44170d2fe845bf))
* improve type annotations and handle optional notes in receipts routes ([b031e67](https://github.com/shawnphoffman/medstash/commit/b031e67b356447eb6be355875a7f0d2aa685d22d))
* remove unused import in receipts route ([5ad0e48](https://github.com/shawnphoffman/medstash/commit/5ad0e482b5bcc3c6002dffd8e8a94874891693cd))
* reorganize form fields in ReceiptDetailPage and UploadPage ([0f36129](https://github.com/shawnphoffman/medstash/commit/0f3612904c6e7c5224411fea47b275cebffd195e))
* simplify button labels in ReceiptDetailPage ([27d0a39](https://github.com/shawnphoffman/medstash/commit/27d0a39b8cf0bb07bff41edc83a7efa5a7a7a782))
* simplify date validation and enhance date formatting in ReceiptsPage ([94aa5ee](https://github.com/shawnphoffman/medstash/commit/94aa5eeba19b8cf752314b6eaf74e68946a14e05))
* simplify flag handling in BulkEditDialog ([c456fef](https://github.com/shawnphoffman/medstash/commit/c456fef8b7bed5fcf7a9d79108fdb15e11e93ba1))
* simplify loading state management in ReceiptsPage ([d4046f5](https://github.com/shawnphoffman/medstash/commit/d4046f542fa89872f92a8c0744ab80448c0231e8))
* simplify SettingsPage by removing unused parameters and optimizing state management ([dccfb81](https://github.com/shawnphoffman/medstash/commit/dccfb816cc73518ee24deecda2425e3148d88a1d))
* standardize code formatting and improve readability ([5a81cd7](https://github.com/shawnphoffman/medstash/commit/5a81cd7b791b5d493515ced6ba654c7ea7750b5b))
* standardize code formatting and improve readability ([627d9e3](https://github.com/shawnphoffman/medstash/commit/627d9e3e70b33ecbca60c7d4b2c05026b3d6457c))
* streamline Calendar component structure and improve styling ([8caf569](https://github.com/shawnphoffman/medstash/commit/8caf56955300065642f84ae5ecbdc14ff659c801))
* streamline receipt management text in ReceiptsPage ([b9b78d3](https://github.com/shawnphoffman/medstash/commit/b9b78d3501d69691f140659de9560dbf389fa971))
* streamline SettingsPage functionality and improve event handling ([7366294](https://github.com/shawnphoffman/medstash/commit/7366294c30ae5f7f1d24dc94eb5938826d6f6482))
* update button styles and clean up last refresh time display in ReceiptsPage ([06649b0](https://github.com/shawnphoffman/medstash/commit/06649b081dd05fca7d51dac7fd66cec2128d4c31))
* update default receipt types and ungrouped types for clarity ([4f332f5](https://github.com/shawnphoffman/medstash/commit/4f332f5a19204a2ac941f3c01209a575b3a5750c))
* update ReceiptDetailPage component for improved readability and navigation ([38a10ed](https://github.com/shawnphoffman/medstash/commit/38a10ede4e80aeb92e00b764f52a17a6f14d0d72))
* update versioning scripts to improve flexibility and user experience ([da21833](https://github.com/shawnphoffman/medstash/commit/da218330381bd40e113cfbecefbb65f65307824e))


### Documentation

* add screenshots to README for improved visual documentation ([ee4e44c](https://github.com/shawnphoffman/medstash/commit/ee4e44c269c1087f685f1b6644f5a8a4efb2d623))
* update README to clarify project purpose and deployment instructions ([68ea401](https://github.com/shawnphoffman/medstash/commit/68ea4019e41c2565388e7c2a32dfc95450b69d3f))
* update README with important project stability notice ([4b85379](https://github.com/shawnphoffman/medstash/commit/4b8537913c8accde94954b1c87034cc0681ef1d8))


### Tests

* add mock for receipt type groups in UploadPage tests ([a24c6b6](https://github.com/shawnphoffman/medstash/commit/a24c6b6f92c34884f02903846cb6ed5f12268b44))
* enhance BulkUploadPage and ReceiptDetailPage tests ([4eec58f](https://github.com/shawnphoffman/medstash/commit/4eec58fcd28f1247c97338a3f03da657687dc9df))
* update settings tests for whitelist validation ([0fdbc3e](https://github.com/shawnphoffman/medstash/commit/0fdbc3e6f08f6df1af4be2323ad09097570d4397))
* update test imports and type assertions ([7a2d9a6](https://github.com/shawnphoffman/medstash/commit/7a2d9a61f890ea5315e3ea27dbeb7e5c2482ad54))
* update TypeScript configuration and clean up test imports ([b6befb8](https://github.com/shawnphoffman/medstash/commit/b6befb8bdc0063bc53272390935803075c0a07df))


### CI/CD

* set up release-please for automated releases and changelogs ([319b5f8](https://github.com/shawnphoffman/medstash/commit/319b5f8cc6bf219efb1a07de71949af8cbe19425))

## [0.4.0](https://github.com/shawnphoffman/medstash/compare/v0.3.2...v0.4.0) (2026-04-09)


### Features

* add dry-run preview for file rename and organize operations ([3b7efc6](https://github.com/shawnphoffman/medstash/commit/3b7efc6c666473c67c5397d5fa22ee81da9c86b8))
* add integrity manifest to receipt exports ([ac6b955](https://github.com/shawnphoffman/medstash/commit/ac6b955f9a98a0bfbeec8ff6bb0a65a4139c39a0))
* **backend:** add data integrity check and repair endpoint ([df6c09b](https://github.com/shawnphoffman/medstash/commit/df6c09bead308206fcef210049f574ffd9c008c1))
* **backend:** add file operation audit logging ([69e4847](https://github.com/shawnphoffman/medstash/commit/69e48474d2897a7d07e733b38719ea397e15dae9))
* **frontend:** add explicit confirmation for file deletion and replacement ([cbe8a8a](https://github.com/shawnphoffman/medstash/commit/cbe8a8a63d49577cd7cb8fedaa6f4083317baf53))
* **frontend:** add support dialog with PCTA and developer donation links ([cd663c9](https://github.com/shawnphoffman/medstash/commit/cd663c99440a64ada007d2712c279b1cf7970596))
* show detailed error information for bulk file operations ([2f4a526](https://github.com/shawnphoffman/medstash/commit/2f4a5263124a14374cd8a10e1532e9ffea32506b))


### Bug Fixes

* **backend:** clean up partial state when receipt upload fails ([9d3b2e4](https://github.com/shawnphoffman/medstash/commit/9d3b2e445018936fc1b3db979e27b6768e831a26))
* **backend:** ensure consistent file path resolution after directory migration ([4e87ff4](https://github.com/shawnphoffman/medstash/commit/4e87ff4837bc97cc7741b47c3e7122e0f81d89f3))
* **backend:** mark images as optimized only after file replacement succeeds ([8d007f2](https://github.com/shawnphoffman/medstash/commit/8d007f226aa6d987f5a17567c5ea5cf278724362))
* **backend:** prevent data loss during file replacement ([69941b5](https://github.com/shawnphoffman/medstash/commit/69941b56519557bbad618e81b88e6db2755dbf72))
* **backend:** prevent database updates when file rename fails on disk ([3eec73b](https://github.com/shawnphoffman/medstash/commit/3eec73b738c337cd5d5c06052e37d39677a32619))
* **backend:** resolve orphaned files when deleting receipts ([becbb7e](https://github.com/shawnphoffman/medstash/commit/becbb7e685caca068de6eee36b0fa69943ce8d69))


### Code Refactoring

* **backend:** wrap multi-step database operations in explicit transactions ([07bf9a5](https://github.com/shawnphoffman/medstash/commit/07bf9a55a749333625912b7831d804041f72f80d))


### CI/CD

* set up release-please for automated releases and changelogs ([319b5f8](https://github.com/shawnphoffman/medstash/commit/319b5f8cc6bf219efb1a07de71949af8cbe19425))
