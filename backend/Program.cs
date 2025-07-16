using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TodoApi;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<TodoDb>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("TodosDb"))); builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => {
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "Todo API", Version = "v1" });
});
builder.Services.AddSignalR();
// Configure CORS to allow requests from the frontend development server
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            var frontendOrigin = builder.Configuration["FrontendOrigin"] ?? "http://localhost:5173";
            policy.WithOrigins(frontendOrigin)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials(); // Required for SignalR
        });
});
var app = builder.Build();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Todo API V1");
    });
}
app.UseCors("AllowFrontend");
app.UseRouting();
app.UseAuthorization();


app.UseEndpoints(endpoints =>
{
    endpoints.MapHub<TodoHub>("/todohub");
});

using var scope = app.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<TodoDb>();
db.Database.EnsureCreated();

app.MapGroup("/todos")
    .MapTodoApi();

app.Run();
