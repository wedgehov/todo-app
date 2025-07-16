# Stage 1: Build the application
# Use the .NET 9.0 SDK image to build the project.
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy the project file and restore dependencies. This layer is cached
# unless the .csproj file changes.
COPY TodoApi.csproj .
RUN dotnet restore "TodoApi.csproj"

# Copy the rest of the source code and publish the application.
COPY . .
RUN dotnet publish "TodoApi.csproj" -c Release -o /app/publish

# Stage 2: Create the final, smaller runtime image.
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "TodoApi.dll"]