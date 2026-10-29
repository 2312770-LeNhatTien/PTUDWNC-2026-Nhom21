FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG TARGETARCH
WORKDIR /source
COPY src/Backend/Directory.Build.props src/Backend/
COPY src/Backend/CulinaryBlog.Domain/*.csproj src/Backend/CulinaryBlog.Domain/
COPY src/Backend/CulinaryBlog.Application/*.csproj src/Backend/CulinaryBlog.Application/
COPY src/Backend/CulinaryBlog.Infrastructure/*.csproj src/Backend/CulinaryBlog.Infrastructure/
COPY src/Backend/CulinaryBlog.API/*.csproj src/Backend/CulinaryBlog.API/
# Chỉ publish native assets của kiến trúc đích, tránh mang cả thư viện Windows/macOS.
RUN dotnet restore src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj -a ${TARGETARCH}
COPY src/Backend/ src/Backend/
RUN dotnet publish src/Backend/CulinaryBlog.API -c Release --no-restore -a ${TARGETARCH} --self-contained false -o /app/publish /p:UseAppHost=false \
    && rm -f /app/publish/appsettings.Development.json

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish ./
# Thư mục được giữ bởi volume, app chạy bằng user không đặc quyền.
RUN mkdir -p /app/public/seo /app/keys && chown -R ${APP_UID}:${APP_UID} /app
USER ${APP_UID}
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=4s --start-period=30s --retries=6 CMD curl --fail --silent http://127.0.0.1:8080/health/ready || exit 1
ENTRYPOINT ["dotnet", "CulinaryBlog.API.dll"]
