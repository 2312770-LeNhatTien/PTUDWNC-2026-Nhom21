using System.Text.Json;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CulinaryBlog.Infrastructure.Persistence;

// Nạp bộ công thức đã biên soạn; không sinh số liệu/nguyên liệu ngẫu nhiên.
public static class DatabaseSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var services = scope.ServiceProvider;
        var logger = services.GetRequiredService<ILogger<CulinaryBlogDbContext>>();
        var db = services.GetRequiredService<CulinaryBlogDbContext>();
        var users = services.GetRequiredService<UserManager<ApplicationUser>>();
        var roles = services.GetRequiredService<RoleManager<IdentityRole>>();
        await using var transaction = await db.Database.BeginTransactionAsync();
        foreach (var role in new[] { "Admin", "Author", "User" })
            if (!await roles.RoleExistsAsync(role))
                EnsureSucceeded(await roles.CreateAsync(new IdentityRole(role)));

        // Năm tài khoản dùng chung để mỗi thành viên demo đúng mười công thức.
        var accounts = new (string Email, string Name, string Role, string Password)[]
        {
            ("admin@culinary.local", "Quản Trị Viên", "Admin", "Admin@123"),
            ("tien@culinary.local", "Lê Nhật Tiến", "Author", "Demo@123"),
            ("toan@culinary.local", "Nguyễn Viết Toàn", "Author", "Demo@123"),
            ("tuan@culinary.local", "Nguyễn Đình Tuấn", "Author", "Demo@123"),
            ("duc@culinary.local", "Lâm Văn Đức", "Author", "Demo@123")
        };
        var authors = new Dictionary<string, ApplicationUser>();
        foreach (var account in accounts)
        {
            var user = await users.FindByEmailAsync(account.Email);
            if (user is null)
            {
                user = ApplicationUser.Create(account.Email, account.Name,
                    account.Role == "Admin" ? "admin" : account.Email);
                user.EmailConfirmed = true;
                EnsureSucceeded(await users.CreateAsync(user, account.Password));
            }
            if (!await users.IsInRoleAsync(user, account.Role))
                EnsureSucceeded(await users.AddToRoleAsync(user, account.Role));
            authors.Add(account.Email, user);
        }
        var previousAuthor = await users.FindByEmailAsync("2312770@dlu.edu.vn");
        await SeedCategoriesAsync(db, logger);

        var demoEmails = new[] { "bep_truong_an@culinary.local", "ha_bep_nha@culinary.local",
            "quang_am_thuc_viet@culinary.local", "mai_chay_tam@culinary.local", "vinh_bbq@culinary.local" };
        var demoAuthorIds = await db.Users.Where(u => demoEmails.Contains(u.Email!)).Select(u => u.Id).ToListAsync();
        var oldSlugs = new[] { "goi-cuon-tom-thit-thanh-mat", "nam-dui-ga-kho-tieu-chay-dam-da",
            "che-buoi-an-giang-khong-dang", "pho-bo-tai-lan-ha-noi", "com-tam-suon-bi-cha-sai-gon", "banh-xeo-gion-rum-mien-tay" };
        var oldInstructions = new[] {
            "Luộc tôm thịt chín tới, cuốn khéo tay cùng bún và rau sống, chấm sốt tương đen bơ đậu phộng béo bùi.",
            "Kho nấm đùi gà với nước tương, tiêu xanh, dầu hào chay trong nồi đất đến khi nước sốt keo lại óng ánh.",
            "Khử đắng cùi bưởi bằng muối và phèn chua, áo bột năng luộc trong veo, nấu cùng đậu xanh hấp và nước cốt dừa.",
            "Nấu nước dùng từ xương bò nướng, xào thịt bò nhanh tay với tỏi trên lửa lớn rồi chan nước dùng sôi sùng sục.",
            "Ướp sườn qua đêm, nướng trên than hồng, hấp chả trứng và pha nước mắm kẹo.",
            "Pha bột với nước cốt dừa và bia để giòn lâu, chiên áp chảo lửa lớn cuốn rau cải xanh và chấm nước mắm chua ngọt." };
        // Dọn đúng dấu vết seeder cũ, không xóa các bài thật do thành viên viết thêm.
        var removed = await db.Recipes.IgnoreQueryFilters().Where(r => demoAuthorIds.Contains(r.AuthorId) &&
            ((EF.Functions.Like(r.Title, "%#%") && r.Instructions == "Lần lượt thực hiện các bước chuẩn bị, sơ chế, xào nấu và trình bày theo đúng hướng dẫn kỹ thuật bên dưới để đạt chuẩn vị nhà hàng.") ||
             (oldSlugs.Contains(r.Slug) && oldInstructions.Contains(r.Instructions)))).ExecuteDeleteAsync();
        if (removed > 0)
            (await db.Set<CacheVersion>().SingleAsync(v => v.Id == 1)).Advance();

        using var stream = typeof(DatabaseSeeder).Assembly.GetManifestResourceStream(
            "CulinaryBlog.Infrastructure.Persistence.Data.vietnamese-recipes.json")
            ?? throw new InvalidOperationException("Thiếu bộ công thức đi kèm ứng dụng.");
        using var document = await JsonDocument.ParseAsync(stream);
        var categories = await db.Categories.ToDictionaryAsync(c => c.Slug);
        foreach (var item in document.RootElement.EnumerateArray())
        {
            var author = authors[Text(item, "author_email")!];
            var slug = Text(item, "slug")!;
            // Đổi đúng chủ cũ trong transaction trước khi đọc phiên bản do trigger sinh.
            if (previousAuthor is not null)
            {
                var reassigned = await db.Recipes.IgnoreQueryFilters()
                    .Where(r => r.Slug == slug && r.AuthorId == previousAuthor.Id)
                    .ExecuteUpdateAsync(setters => setters.SetProperty(r => r.AuthorId, author.Id));
                if (reassigned > 0)
                    (await db.Set<CacheVersion>().SingleAsync(v => v.Id == 1)).Advance();
            }
            var recipe = await db.Recipes.IgnoreQueryFilters().AsSplitQuery().Include(r => r.Images).Include(r => r.Steps)
                .SingleOrDefaultAsync(r => r.Slug == slug);
            if (recipe is null)
            {
                recipe = Recipe.Create(Text(item, "title")!, Text(item, "description")!, Text(item, "instructions")!,
                    categories[Text(item, "category")!].Id, author.Id,
                    item.GetProperty("prep_time").GetInt32(), item.GetProperty("cook_time").GetInt32(),
                    item.GetProperty("servings").GetInt32(), (RecipeDifficulty)item.GetProperty("difficulty").GetInt16());
                recipe.SetSlug(slug);
                foreach (var i in item.GetProperty("ingredients").EnumerateArray())
                    recipe.Ingredients.Add(RecipeIngredient.Create(recipe.Id, Text(i, "name")!,
                        i.GetProperty("quantity").ValueKind == JsonValueKind.Null ? null : i.GetProperty("quantity").GetDecimal(),
                        Text(i, "unit"), Text(i, "notes"), i.GetProperty("order_index").GetInt32()));
                foreach (var s in item.GetProperty("steps").EnumerateArray())
                    recipe.Steps.Add(RecipeStep.Create(recipe.Id, s.GetProperty("number").GetInt32(), Text(s, "title")!,
                        Text(s, "description")!, s.GetProperty("timer_minutes").ValueKind == JsonValueKind.Null
                            ? null : s.GetProperty("timer_minutes").GetInt32(), ImageUrl(Text(s, "image"))));
                recipe.Images.Add(RecipeImage.Create(recipe.Id, ImageUrl(Text(item, "cover"))!, recipe.Title, true));
                recipe.Publish();
                db.Recipes.Add(recipe);
                continue;
            }

            // Giữ nội dung/ảnh đã chỉnh sửa; chỉ chuyển đúng URL ảnh cũ sang ảnh đi kèm repo.
            if (recipe.IsDeleted || recipe.AuthorId != author.Id || recipe.Instructions != Text(item, "instructions")) continue;
            var cover = ImageUrl(Text(item, "cover"))!;
            var primary = recipe.Images.FirstOrDefault(i => !i.IsDeleted && i.IsPrimary);
            if (primary is null && !recipe.Images.Any(i => !i.IsDeleted))
                recipe.Images.Add(RecipeImage.Create(recipe.Id, cover, recipe.Title, true));
            else if (primary is not null && (primary.OriginalUrl == Text(item, "previous_cover") ||
                     primary.OriginalUrl == "/recipe-demo/" + Text(item, "cover")))
            {
                db.Entry(primary).Property(i => i.OriginalUrl).CurrentValue = cover;
                primary.SetGeneratedUrls(null, null);
            }
            foreach (var s in item.GetProperty("steps").EnumerateArray())
            {
                var step = recipe.Steps.SingleOrDefault(x => !x.IsDeleted && x.StepNumber == s.GetProperty("number").GetInt32());
                var image = ImageUrl(Text(s, "image"));
                if (step is not null && image is not null && step.Title == Text(s, "title") && step.Description == Text(s, "description") &&
                    (string.IsNullOrEmpty(step.ImageUrl) || step.ImageUrl == Text(s, "previous_image") ||
                     step.ImageUrl == "/recipe-demo/" + Text(s, "image")))
                    step.Update(null, null, null, step.TimerMinutes, image);
            }
        }
        await db.SaveChangesAsync();
        foreach (var user in await db.Users.Where(u => demoEmails.Contains(u.Email!)).ToListAsync())
            if (!await db.Recipes.IgnoreQueryFilters().AnyAsync(r => r.AuthorId == user.Id) &&
                !await db.RecipeReviews.IgnoreQueryFilters().AnyAsync(r => r.AuthorId == user.Id))
                EnsureSucceeded(await users.DeleteAsync(user));
        await transaction.CommitAsync();
        logger.LogInformation("Đã dọn {Removed} bài mẫu; hiện có {Count} công thức.", removed, await db.Recipes.CountAsync());
    }

    private static async Task SeedCategoriesAsync(CulinaryBlogDbContext db, ILogger logger)
    {
        var definedCategories = new (string Name, string Description, string ImageUrl, int OrderIndex)[]
        {
            ("Món Chính", "Những món ăn chính thơm ngon, đậm đà cho bữa cơm gia đình và tiệc tùng.", "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80", 1),
            ("Món Nước & Canh", "Các món bún, phở, miến và canh thanh mát giải nhiệt, ấm lòng ngày mưa.", "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80", 2),
            ("Khai Vị & Ăn Vặt", "Món ăn nhẹ, gỏi cuốn, bánh mặn bắt vị kích thích vị giác đầu bữa ăn.", "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80", 3),
            ("Món Tráng Miệng", "Các món chè, bánh ngọt, trái cây và kem ngọt ngào kết thúc bữa ăn trọn vẹn.", "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80", 4),
            ("Món Chay Thanh Tịnh", "Ẩm thực thuần chay thanh tịnh, dinh dưỡng cân bằng và tốt cho sức khỏe.", "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80", 5),
            ("Đồ Uống & Giải Khát", "Trà thảo mộc, nước ép hoa quả, sinh tố và đồ uống mát lạnh sảng khoái.", "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80", 6),
            ("Món Lẩu Nghi Ngút", "Nồi lẩu ấm cúng sum vầy gia đình ngày đông với nước dùng đậm đà.", "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80", 7),
            ("Món Nướng BBQ", "Các món nướng tẩm ướp thơm lừng trên than hoa và nồi chiên không dầu.", "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80", 8),
            ("Món Xào & Hấp", "Món xào giòn ngọt giữ trọn vitamin và món hấp thanh đạm.", "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80", 9),
            ("Món Kho & Rim", "Món cá kho tộ, thịt kho tàu đậm đà sánh quyện cực kỳ hao cơm.", "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80", 10),
            ("Ẩm Thực Miền Bắc", "Hương vị thanh tao, tinh tế chuẩn mực của đất kinh kỳ nghìn năm văn hiến.", "https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80", 11),
            ("Ẩm Thực Miền Trung", "Cay nồng, đậm vị và cầu kỳ mang đậm phong cách cung đình xứ Huế.", "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80", 12),
            ("Ẩm Thực Miền Nam", "Phóng khoáng, ngọt lành nước cốt dừa và đậm đà cá tôm miệt vườn.", "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80", 13),
            ("Hải Sản Tươi Sống", "Các món tôm, cua, cá, mực chế biến chuẩn vị giữ độ tươi ngọt tự nhiên.", "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=800&q=80", 14),
            ("Bánh Truyền Thống", "Bánh chưng, bánh giầy, bánh tét, bánh bèo, bánh ít thơm dẻo mùi nếp.", "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80", 15),
            ("Salad & Gỏi Nộm", "Các món gỏi ngó sen, nộm hoa chuối, salad rau củ giòn mát giải ngấy.", "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80", 16),
            ("Món Ăn Sáng Tiện Lợi", "Bánh mì kẹp, xôi xéo, trứng ốp la, pancake nhanh gọn đầy đủ năng lượng.", "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80", 17),
            ("Món Ăn Dặm Cho Bé", "Cháo dinh dưỡng, súp rau củ, bánh flan bổ dưỡng cho trẻ nhỏ lớn khôn.", "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80", 18),
            ("Món Eat Clean & Giảm Cân", "Thực đơn ức gà, yến mạch, bơ hạt, salad hỗ trợ giữ dáng và đẹp da.", "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80", 19),
            ("Nước Chấm & Gia Vị", "Bí quyết pha nước mắm chua ngọt, sốt ướp thịt, muối ớt xanh thơm nức.", "https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=800&q=80", 20),
            ("Ẩm Thực Đường Phố", "Xiên que, bánh tráng nướng, bắp xào, ốc cay thơm nức đường phố Việt Nam.", "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80", 21),
            ("Món Cơm Gia Đình", "Mâm cơm đầm ấm trọn vẹn canh, kho, xào gắn kết yêu thương các thế hệ.", "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80", 22)
        };

        var newCategories = new List<Category>();
        foreach (var cat in definedCategories)
        {
            if (!await db.Categories.AnyAsync(c => c.Name == cat.Name))
            {
                newCategories.Add(Category.Create(cat.Name, cat.Description, cat.ImageUrl, cat.OrderIndex));
            }
        }

        if (newCategories.Count > 0)
        {
            await db.Categories.AddRangeAsync(newCategories);
            await db.SaveChangesAsync();
            logger.LogInformation("Đã bổ sung nạp thêm {Count} danh mục mới.", newCategories.Count);
        }
    }

    private static string? Text(JsonElement item, string name) => item.GetProperty(name).GetString();
    private static string? ImageUrl(string? file) => file is null ? null : "/recipe-images/" + file;
    private static void EnsureSucceeded(IdentityResult result)
    {
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
    }
}
