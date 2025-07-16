using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace TodoApi;

public static class TodoEndpoints
{
    public static RouteGroupBuilder MapTodoApi(this RouteGroupBuilder group)
    {
        group.MapGet("/", GetTodos);
        group.MapPost("/", CreateTodo);
        group.MapPut("/{id}", UpdateTodo);
        group.MapDelete("/{id}", DeleteTodo);

        return group;
    }

    public static async Task<List<Todo>> GetTodos(TodoDb db)
    {
        return await db.Todos.ToListAsync();
    }

    public static async Task<IResult> CreateTodo(CreateTodoDto todo, TodoDb db, IHubContext<TodoHub> hubContext)
    {
        var newTodo = new Todo { Title = todo.Title, IsComplete = false };
        db.Todos.Add(newTodo);
        await db.SaveChangesAsync();
        await hubContext.Clients.All.SendAsync("ReceiveTodos", await db.Todos.ToListAsync());
        return Results.Created($"/todos/{newTodo.Id}", newTodo);
    }

    public static async Task<IResult> UpdateTodo(int id, Todo updateTodo, TodoDb db, IHubContext<TodoHub> hubContext)
    {
        var todo = await db.Todos.FindAsync(id);

        if (todo is null) return Results.NotFound();
        todo.IsComplete = updateTodo.IsComplete;
        await db.SaveChangesAsync();
        await hubContext.Clients.All.SendAsync("ReceiveTodos", await db.Todos.ToListAsync());
        return Results.NoContent();
    }

    public static async Task<IResult> DeleteTodo(int id, TodoDb db, IHubContext<TodoHub> hubContext)
    {
        var todo = await db.Todos.FindAsync(id);
        if (todo is null) return Results.NotFound();
        db.Todos.Remove(todo);
        await db.SaveChangesAsync();
        await hubContext.Clients.All.SendAsync("ReceiveTodos", await db.Todos.ToListAsync());
        return Results.NoContent();
    }
}