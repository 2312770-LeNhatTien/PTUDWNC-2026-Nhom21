# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM golang:1.26-bookworm AS build
ARG TARGETARCH
WORKDIR /source
# Giữ release đang dùng, kiểm checksum thay vì phụ thuộc registry MinIO đã khóa.
ADD --checksum=sha256:b9a3289adf1722ede8f2da3620f76fe3650a58cded051d1f3db6e1fca26895a0 https://codeload.github.com/minio/minio/tar.gz/refs/tags/RELEASE.2024-01-16T16-07-38Z /tmp/source.tar.gz
RUN tar -xzf /tmp/source.tar.gz --strip-components=1
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} go build -mod=readonly -trimpath \
    -ldflags="-s -w -X github.com/minio/minio/cmd.Version=2024-01-16T16:07:38Z -X github.com/minio/minio/cmd.ReleaseTag=RELEASE.2024-01-16T16-07-38Z -X github.com/minio/minio/cmd.CommitID=ca258c04cb1dea33c31fed86250eaa3d1f020ff8 -X github.com/minio/minio/cmd.ShortCommitID=ca258c04cb1d -X github.com/minio/minio/cmd.CopyrightYear=2024" \
    -o /out/minio .

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /out/minio /usr/local/bin/minio
COPY --from=build /source/LICENSE /usr/share/licenses/minio/LICENSE
LABEL org.opencontainers.image.source="https://github.com/minio/minio" \
      org.opencontainers.image.revision="ca258c04cb1dea33c31fed86250eaa3d1f020ff8" \
      org.opencontainers.image.version="RELEASE.2024-01-16T16-07-38Z" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
ENV MINIO_UPDATE=off
EXPOSE 9000 9001
HEALTHCHECK --interval=5s --timeout=4s --retries=12 CMD curl --fail --silent http://127.0.0.1:9000/minio/health/ready || exit 1
ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
