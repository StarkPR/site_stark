import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;

/** Public read-only content API. The PHP frontend calls this on its private network. */
public class Catalogo {
    public static void main(String[] args) throws Exception {
        Path content = Path.of(System.getenv().getOrDefault("STARK_DADOS", "dist/data/equipe.json"));
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8081"));
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/equipe", exchange -> {
            int status;
            byte[] bytes;
            try {
                if (!exchange.getRequestURI().getPath().equals("/equipe")) {
                    status = 404;
                    bytes = "{}".getBytes(StandardCharsets.UTF_8);
                } else if (!"GET".equals(exchange.getRequestMethod())) {
                    status = 405;
                    exchange.getResponseHeaders().set("Allow", "GET");
                    bytes = "{}".getBytes(StandardCharsets.UTF_8);
                } else {
                    bytes = Files.readAllBytes(content);
                    status = 200;
                }
            } catch (java.io.IOException ex) {
                status = 503;
                bytes = "{}".getBytes(StandardCharsets.UTF_8);
            }
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            exchange.getResponseHeaders().set("Cache-Control", "no-cache");
            exchange.sendResponseHeaders(status, bytes.length);
            try (var out = exchange.getResponseBody()) { out.write(bytes); }
        });
        server.start();
    }
}
