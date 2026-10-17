# JSch reflects into its own ciphers. Leave it alone if minify is turned on later.
-keep class com.jcraft.jsch.** { *; }
-dontwarn com.jcraft.jsch.**
-dontwarn org.bouncycastle.**
