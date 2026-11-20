// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "PlugShelf",
    platforms: [.macOS(.v13)],
    targets: [
        .target(
            name: "CPlugHost",
            path: "Sources/CPlugHost",
            linkerSettings: [.linkedFramework("CoreFoundation")]
        ),
        .executableTarget(
            name: "PlugShelf",
            dependencies: ["CPlugHost"],
            path: "Sources/PlugShelf",
            linkerSettings: [.linkedLibrary("sqlite3")]
        ),
    ]
)
