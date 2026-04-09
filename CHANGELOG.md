# Changelog

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
