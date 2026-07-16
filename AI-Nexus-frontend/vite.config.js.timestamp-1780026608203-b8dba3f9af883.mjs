// vite.config.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "file:///C:/list-projects/AI-Nexus/AI-Nexus-frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/list-projects/AI-Nexus/AI-Nexus-frontend/node_modules/@vitejs/plugin-react-swc/index.mjs";
var __vite_injected_original_import_meta_url = "file:///C:/list-projects/AI-Nexus/AI-Nexus-frontend/vite.config.js";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
function resolveFrontendSslCredentials() {
  const sslDirCandidates = [path.resolve(__dirname, "cert"), path.resolve(__dirname, "ssl")];
  const sslDir = sslDirCandidates.find((dir) => fs.existsSync(dir));
  if (!sslDir) {
    return void 0;
  }
  let keyPath = process.env.VITE_SSL_KEY_PATH?.trim();
  let certPath = process.env.VITE_SSL_CERT_PATH?.trim();
  if (!keyPath) {
    const iscaKey = path.join(sslDir, "ainexus.isca.org.sg-key.pem");
    keyPath = fs.existsSync(iscaKey) ? iscaKey : path.join(sslDir, "key.pem");
  }
  if (!certPath) {
    const iscaCert = path.join(sslDir, "ainexus.isca.org.sg-chain.pem");
    certPath = fs.existsSync(iscaCert) ? iscaCert : path.join(sslDir, "cert.pem");
  }
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    return void 0;
  }
  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
}
var httpsCredentials = resolveFrontendSslCredentials();
var vite_config_default = defineConfig(({ mode }) => {
  const isDevOrProd = mode === "development" || mode === "production";
  const canUseHttps = isDevOrProd && Boolean(httpsCredentials);
  return {
    plugins: [react()],
    resolve: {
      alias: {
        src: path.resolve(__dirname, "src")
      }
    },
    server: {
      port: 3e3,
      strictPort: true,
      ...canUseHttps && process.env.VITE_DEV_HTTPS === "1" ? { https: httpsCredentials } : {}
    },
    preview: {
      port: 3e3,
      strictPort: true,
      ...canUseHttps ? { https: httpsCredentials } : {}
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxsaXN0LXByb2plY3RzXFxcXEFJLU5leHVzXFxcXEFJLU5leHVzLWZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxsaXN0LXByb2plY3RzXFxcXEFJLU5leHVzXFxcXEFJLU5leHVzLWZyb250ZW5kXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9saXN0LXByb2plY3RzL0FJLU5leHVzL0FJLU5leHVzLWZyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IGZzIGZyb20gJ25vZGU6ZnMnO1xyXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xyXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnO1xyXG5cclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnO1xyXG5cclxuY29uc3QgX19maWxlbmFtZSA9IGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKTtcclxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKF9fZmlsZW5hbWUpO1xyXG5cclxuLyoqIEZyb250ZW5kIGNlcnQgcGF0aHMgb25seS4gKi9cclxuZnVuY3Rpb24gcmVzb2x2ZUZyb250ZW5kU3NsQ3JlZGVudGlhbHMoKSB7XHJcbiAgY29uc3Qgc3NsRGlyQ2FuZGlkYXRlcyA9IFtwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnY2VydCcpLCBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3NsJyldO1xyXG4gIGNvbnN0IHNzbERpciA9IHNzbERpckNhbmRpZGF0ZXMuZmluZCgoZGlyKSA9PiBmcy5leGlzdHNTeW5jKGRpcikpO1xyXG4gIGlmICghc3NsRGlyKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuXHJcbiAgbGV0IGtleVBhdGggPSBwcm9jZXNzLmVudi5WSVRFX1NTTF9LRVlfUEFUSD8udHJpbSgpO1xyXG4gIGxldCBjZXJ0UGF0aCA9IHByb2Nlc3MuZW52LlZJVEVfU1NMX0NFUlRfUEFUSD8udHJpbSgpO1xyXG5cclxuICBpZiAoIWtleVBhdGgpIHtcclxuICAgIGNvbnN0IGlzY2FLZXkgPSBwYXRoLmpvaW4oc3NsRGlyLCAnYWluZXh1cy5pc2NhLm9yZy5zZy1rZXkucGVtJyk7XHJcbiAgICBrZXlQYXRoID0gZnMuZXhpc3RzU3luYyhpc2NhS2V5KSA/IGlzY2FLZXkgOiBwYXRoLmpvaW4oc3NsRGlyLCAna2V5LnBlbScpO1xyXG4gIH1cclxuICBpZiAoIWNlcnRQYXRoKSB7XHJcbiAgICBjb25zdCBpc2NhQ2VydCA9IHBhdGguam9pbihzc2xEaXIsICdhaW5leHVzLmlzY2Eub3JnLnNnLWNoYWluLnBlbScpO1xyXG4gICAgY2VydFBhdGggPSBmcy5leGlzdHNTeW5jKGlzY2FDZXJ0KSA/IGlzY2FDZXJ0IDogcGF0aC5qb2luKHNzbERpciwgJ2NlcnQucGVtJyk7XHJcbiAgfVxyXG5cclxuICBpZiAoIWZzLmV4aXN0c1N5bmMoa2V5UGF0aCkgfHwgIWZzLmV4aXN0c1N5bmMoY2VydFBhdGgpKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICByZXR1cm4ge1xyXG4gICAga2V5OiBmcy5yZWFkRmlsZVN5bmMoa2V5UGF0aCksXHJcbiAgICBjZXJ0OiBmcy5yZWFkRmlsZVN5bmMoY2VydFBhdGgpLFxyXG4gIH07XHJcbn1cclxuXHJcbmNvbnN0IGh0dHBzQ3JlZGVudGlhbHMgPSByZXNvbHZlRnJvbnRlbmRTc2xDcmVkZW50aWFscygpO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIGNvbnN0IGlzRGV2T3JQcm9kID0gbW9kZSA9PT0gJ2RldmVsb3BtZW50JyB8fCBtb2RlID09PSAncHJvZHVjdGlvbic7XHJcbiAgY29uc3QgY2FuVXNlSHR0cHMgPSBpc0Rldk9yUHJvZCAmJiBCb29sZWFuKGh0dHBzQ3JlZGVudGlhbHMpO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcGx1Z2luczogW3JlYWN0KCldLFxyXG4gICAgcmVzb2x2ZToge1xyXG4gICAgICBhbGlhczoge1xyXG4gICAgICAgIHNyYzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIHNlcnZlcjoge1xyXG4gICAgICBwb3J0OiAzMDAwLFxyXG4gICAgICBzdHJpY3RQb3J0OiB0cnVlLFxyXG4gICAgICAuLi4oY2FuVXNlSHR0cHMgJiYgcHJvY2Vzcy5lbnYuVklURV9ERVZfSFRUUFMgPT09ICcxJyA/IHsgaHR0cHM6IGh0dHBzQ3JlZGVudGlhbHMgfSA6IHt9KSxcclxuICAgIH0sXHJcbiAgICBwcmV2aWV3OiB7XHJcbiAgICAgIHBvcnQ6IDMwMDAsXHJcbiAgICAgIHN0cmljdFBvcnQ6IHRydWUsXHJcbiAgICAgIC4uLihjYW5Vc2VIdHRwcyA/IHsgaHR0cHM6IGh0dHBzQ3JlZGVudGlhbHMgfSA6IHt9KSxcclxuICAgIH0sXHJcbiAgfTtcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMlQsT0FBTyxRQUFRO0FBQzFVLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQUU5QixTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFMbUwsSUFBTSwyQ0FBMkM7QUFPdFAsSUFBTSxhQUFhLGNBQWMsd0NBQWU7QUFDaEQsSUFBTSxZQUFZLEtBQUssUUFBUSxVQUFVO0FBR3pDLFNBQVMsZ0NBQWdDO0FBQ3ZDLFFBQU0sbUJBQW1CLENBQUMsS0FBSyxRQUFRLFdBQVcsTUFBTSxHQUFHLEtBQUssUUFBUSxXQUFXLEtBQUssQ0FBQztBQUN6RixRQUFNLFNBQVMsaUJBQWlCLEtBQUssQ0FBQyxRQUFRLEdBQUcsV0FBVyxHQUFHLENBQUM7QUFDaEUsTUFBSSxDQUFDLFFBQVE7QUFDWCxXQUFPO0FBQUEsRUFDVDtBQUVBLE1BQUksVUFBVSxRQUFRLElBQUksbUJBQW1CLEtBQUs7QUFDbEQsTUFBSSxXQUFXLFFBQVEsSUFBSSxvQkFBb0IsS0FBSztBQUVwRCxNQUFJLENBQUMsU0FBUztBQUNaLFVBQU0sVUFBVSxLQUFLLEtBQUssUUFBUSw2QkFBNkI7QUFDL0QsY0FBVSxHQUFHLFdBQVcsT0FBTyxJQUFJLFVBQVUsS0FBSyxLQUFLLFFBQVEsU0FBUztBQUFBLEVBQzFFO0FBQ0EsTUFBSSxDQUFDLFVBQVU7QUFDYixVQUFNLFdBQVcsS0FBSyxLQUFLLFFBQVEsK0JBQStCO0FBQ2xFLGVBQVcsR0FBRyxXQUFXLFFBQVEsSUFBSSxXQUFXLEtBQUssS0FBSyxRQUFRLFVBQVU7QUFBQSxFQUM5RTtBQUVBLE1BQUksQ0FBQyxHQUFHLFdBQVcsT0FBTyxLQUFLLENBQUMsR0FBRyxXQUFXLFFBQVEsR0FBRztBQUN2RCxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFBQSxJQUNMLEtBQUssR0FBRyxhQUFhLE9BQU87QUFBQSxJQUM1QixNQUFNLEdBQUcsYUFBYSxRQUFRO0FBQUEsRUFDaEM7QUFDRjtBQUVBLElBQU0sbUJBQW1CLDhCQUE4QjtBQUV2RCxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxRQUFNLGNBQWMsU0FBUyxpQkFBaUIsU0FBUztBQUN2RCxRQUFNLGNBQWMsZUFBZSxRQUFRLGdCQUFnQjtBQUUzRCxTQUFPO0FBQUEsSUFDTCxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsSUFDakIsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsV0FBVyxLQUFLO0FBQUEsTUFDcEM7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixZQUFZO0FBQUEsTUFDWixHQUFJLGVBQWUsUUFBUSxJQUFJLG1CQUFtQixNQUFNLEVBQUUsT0FBTyxpQkFBaUIsSUFBSSxDQUFDO0FBQUEsSUFDekY7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFlBQVk7QUFBQSxNQUNaLEdBQUksY0FBYyxFQUFFLE9BQU8saUJBQWlCLElBQUksQ0FBQztBQUFBLElBQ25EO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
