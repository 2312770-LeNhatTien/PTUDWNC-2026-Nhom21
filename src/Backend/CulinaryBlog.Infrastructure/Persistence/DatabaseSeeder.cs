using Bogus;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CulinaryBlog.Infrastructure.Persistence;

/// <summary>
/// Lớp nạp dữ liệu mẫu ban đầu (Database Seeder) cho Culinary Blog.
/// Đảm bảo tiêu chuẩn:
/// - Tạo sẵn các vai trò (Roles) và tài khoản quản trị viên / tác giả mẫu.
/// - Tối thiểu 20 Categories ẩm thực phong phú.
/// - Tối thiểu 100 Recipes đa dạng (sử dụng thư viện Bogus để sinh ngẫu nhiên thực tế).
/// - Mỗi Recipe chứa ít nhất 10 nguyên liệu (RecipeIngredient) và ít nhất 5 bước chế biến (RecipeStep).
/// </summary>
public static class DatabaseSeeder
{
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Code Smell", "S1075", Justification = "URL ảnh mẫu cố định chỉ dùng cho seeder Development, không phải endpoint triển khai.")]
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var services = scope.ServiceProvider;
        var logger = services.GetRequiredService<ILogger<CulinaryBlogDbContext>>();
        var db = services.GetRequiredService<CulinaryBlogDbContext>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

        try
        {
            logger.LogInformation("Bắt đầu kiểm tra và nạp dữ liệu mẫu (Database Seeding)...");

            // 1. Roles
            var roles = new[] { "Admin", "Author", "User" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                    logger.LogInformation("Đã tạo vai trò: {Role}", role);
                }
            }

            // 2. Users (Admin, Bếp Trưởng An, và thêm các tác giả phụ)
            var authors = new List<ApplicationUser>();

            var adminEmail = "admin@culinary.local";
            var adminUser = await userManager.FindByEmailAsync(adminEmail);
            if (adminUser == null)
            {
                adminUser = ApplicationUser.Create(adminEmail, "Quản Trị Viên", "admin");
                adminUser.EmailConfirmed = true;
                adminUser.Bio = "Quản trị viên hệ thống Culinary Blog.";
                adminUser.AvatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80";

                var result = await userManager.CreateAsync(adminUser, "Admin@123");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(adminUser, "Admin");
                    logger.LogInformation("Đã tạo tài khoản Admin mặc định: {Email}", adminEmail);
                }
            }

            var authorEmail = "bep_truong_an@culinary.local";
            var authorUser = await userManager.FindByEmailAsync(authorEmail);
            if (authorUser == null)
            {
                authorUser = ApplicationUser.Create(authorEmail, "Bếp Trưởng An", "bep_truong_an");
                authorUser.EmailConfirmed = true;
                authorUser.Bio = "Đầu bếp đam mê ẩm thực truyền thống Việt Nam với hơn 10 năm kinh nghiệm.";
                authorUser.AvatarUrl = "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=300&q=80";

                var result = await userManager.CreateAsync(authorUser, "Author@123");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(authorUser, "Author");
                    logger.LogInformation("Đã tạo tài khoản Author mặc định: {Email}", authorEmail);
                }
            }
            if (authorUser != null) authors.Add(authorUser);

            // Thêm các tác giả đa dạng theo văn hóa ẩm thực
            var additionalAuthors = new[]
            {
                ("ha_bep_nha@culinary.local", "Nguyễn Thu Hà", "ha_bep_nha", "Yêu thích làm bánh và món tráng miệng gia đình."),
                ("quang_am_thuc_viet@culinary.local", "Trần Đình Quang", "quang_am_thuc", "Chuyên gia ẩm thực đường phố và các món nhậu dân dã."),
                ("mai_chay_tam@culinary.local", "Lê Thanh Mai", "mai_chay_tam", "Chia sẻ các công thức nấu món chay thanh tịnh, dinh dưỡng."),
                ("vinh_bbq@culinary.local", "Phạm Quốc Vinh", "vinh_bbq", "Đam mê đồ nướng BBQ và các món sốt ướp đậm vị.")
            };

            foreach (var (email, displayName, userName, bio) in additionalAuthors)
            {
                var user = await userManager.FindByEmailAsync(email);
                if (user == null)
                {
                    user = ApplicationUser.Create(email, displayName, userName);
                    user.EmailConfirmed = true;
                    user.Bio = bio;
                    user.AvatarUrl = $"https://images.unsplash.com/photo-{1530000000000 + Random.Shared.Next(1000000, 9999999)}?auto=format&fit=crop&w=300&q=80";

                    var result = await userManager.CreateAsync(user, "Author@123");
                    if (result.Succeeded)
                    {
                        await userManager.AddToRoleAsync(user, "Author");
                    }
                }
                if (user != null) authors.Add(user);
            }

            if (authors.Count == 0 && adminUser != null)
            {
                authors.Add(adminUser);
            }

            // 3. Categories (Tối thiểu 22 danh mục chi tiết)
            var existingCategoryCount = await db.Categories.CountAsync();
            if (existingCategoryCount < 20)
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

            var allCategories = await db.Categories.ToListAsync();

            // 4. Recipes: Đảm bảo ít nhất 100 Recipes
            // Mỗi Recipe có:
            // - Ít nhất 10 nguyên liệu (RecipeIngredient)
            // - Ít nhất 5 bước chế biến (RecipeStep)
            // - Ít nhất 1 ảnh (RecipeImage)
            // - Đầy đủ dinh dưỡng (RecipeNutrition)
            var currentRecipeCount = await db.Recipes.CountAsync();
            var targetRecipeCount = 100;

            if (currentRecipeCount < targetRecipeCount)
            {
                var recipesToGenerate = targetRecipeCount - currentRecipeCount;
                logger.LogInformation("Đang sinh ngẫu nhiên {Count} công thức mới bằng thư viện Bogus...", recipesToGenerate);

                var faker = new Faker("vi");

                // Kho từ khóa món ăn Việt Nam thực tế
                var dishPrefixes = new[] { "Cách làm", "Bí quyết nấu", "Hướng dẫn làm", "Công thức chuẩn vị", "Tuyệt chiêu làm", "Mẹo nấu" };
                var dishNames = new[]
                {
                    "Phở Bò Tái Nạm", "Bún Bò Huế Cay Nồng", "Cơm Tấm Sườn Bì Chả", "Bánh Xèo Tôm Nhảy",
                    "Gỏi Cuốn Tôm Thịt", "Chè Bưởi Cốt Dừa", "Cá Lóc Kho Tộ", "Thịt Kho Tàu Trứng Cút",
                    "Gà Hấp Lá Chanh", "Vịt Nấu Chao Miền Tây", "Canh Chua Cá Hú", "Sườn Xào Chua Ngọt",
                    "Mực Nhồi Thịt Sốt Cà", "Bò Kho Bánh Mì", "Bún Riêu Cua Đồng", "Chả Cá Lã Vọng",
                    "Lẩu Thái Hải Sản", "Lẩu Gà Lá É", "Lẩu Nấm Chim Câu", "Nấm Kho Tiêu Xanh Chay",
                    "Đậu Hũ Tứ Xuyên Chay", "Gỏi Ngó Sen Tai Heo", "Nộm Bò Khô Hà Nội", "Bánh Mì Chảo Đặc Biệt",
                    "Chè Thái Sầu Riêng", "Kem Chuối Cốt Dừa", "Bánh Bèo Chén Miền Trung", "Bánh Bột Lọc Huế",
                    "Bánh Khọt Vũng Tàu", "Bánh Cuốn Nóng Thịt Băm", "Xôi Xéo Gà Xé", "Bún Thịt Nướng Chả Giò",
                    "Nem Nướng Nha Trang", "Gà Nướng Muối Ớt", "Heo Quay Giòn Bì", "Bò Nướng Lá Lốt",
                    "Cá Hồi Áp Chảo Sốt Cam", "Tôm Sốt Bơ Tỏi", "Cua Rang Me", "Ốc Hương Xào Trứng Muối",
                    "Canh Cua Rau Đay Mồng Tơi", "Canh Sườn Hầm Rau Củ", "Rau Muống Xào Tỏi", "Mướp Đắng Xào Trứng",
                    "Bắp Bò Ngâm Mắm", "Chân Gà Sả Tắc", "Kho Quẹt Chấm Rau Củ Luộc", "Trứng Cuộn Tam Sắc"
                };

                // Kho nguyên liệu ẩm thực phong phú
                var rawIngredients = new[]
                {
                    ("Thịt bò thăn", "g", 300, 600), ("Thịt ba chỉ heo", "g", 250, 500), ("Sườn heo non", "g", 400, 700),
                    ("Tôm sú tươi", "g", 200, 500), ("Mực ống tươi", "g", 250, 450), ("Phi lê cá lóc", "g", 300, 600),
                    ("Bánh phở tươi", "g", 400, 800), ("Bún tươi sợi nhỏ", "g", 300, 600), ("Gạo tấm thơm", "g", 300, 500),
                    ("Nấm đùi gà", "g", 200, 400), ("Nấm hương khô", "g", 50, 100), ("Mộc nhĩ", "g", 30, 80),
                    ("Đậu phụ trắng", "miếng", 2, 5), ("Trứng gà ta", "quả", 2, 6), ("Hành tây", "củ", 1, 3),
                    ("Gừng tươi", "nhánh", 1, 2), ("Sả cây", "cây", 2, 5), ("Tỏi khô", "tép", 4, 8),
                    ("Hành tím", "củ", 3, 6), ("Ớt hiểm đỏ", "trái", 2, 5), ("Hành lá", "cây", 2, 5),
                    ("Rau mùi ta", "mớ", 1, 2), ("Rau mùi tàu", "mớ", 1, 2), ("Húng quế", "nhánh", 3, 6),
                    ("Giá đỗ sạch", "g", 100, 250), ("Cà rốt", "củ", 1, 2), ("Củ cải trắng", "củ", 1, 2),
                    ("Cà chua chín", "quả", 2, 4), ("Nước dừa tươi", "ml", 200, 500), ("Nước cốt dừa", "ml", 150, 300),
                    ("Nước mắm cá cơm", "muỗng canh", 2, 5), ("Hạt nêm thịt", "muỗng cà phê", 1, 3), ("Đường phèn", "muỗng canh", 1, 2),
                    ("Tiêu đen xay", "muỗng cà phê", 1, 2), ("Dầu hào cao cấp", "muỗng canh", 1, 3), ("Dầu ăn thực vật", "muỗng canh", 2, 4)
                };

                // Kho các bước chế biến chuẩn bếp
                var standardStepTemplates = new[]
                {
                    ("Sơ chế nguyên liệu tươi sống", "Rửa sạch các loại thịt cá qua nước muối loãng, khử mùi tanh bằng gừng rượu rồi cắt miếng vừa ăn để ráo nước.", 15),
                    ("Chuẩn bị rau thơm và gia vị", "Nhặt bỏ lá úa, ngâm rửa sạch rau sống và giá đỗ. Băm nhỏ hành tím, tỏi, ớt và thái khúc hành lá.", 10),
                    ("Tẩm ướp gia vị đậm đà", "Cho nguyên liệu chính vào âu, ướp cùng nước mắm, tiêu, hạt nêm, dầu hào và chút hành tỏi băm trong ít nhất 20 phút cho thấm vị.", 20),
                    ("Phi thơm hành tỏi và xào săn", "Đặt nồi hoặc chảo lên bếp, làm nóng dầu ăn rồi phi thơm hành tím và tỏi băm đến khi vàng ruộm dậy mùi thơm. Cho nguyên liệu chính vào xào săn trên lửa lớn.", 8),
                    ("Nấu nước dùng / Hầm nhừ", "Đổ nước dừa tươi hoặc nước dùng xương vào nồi, đun sôi rồi hạ lửa nhỏ liu riu. Thường xuyên hớt bọt để nước dùng trong và ngọt thanh tự nhiên.", 35),
                    ("Nêm nếm gia vị hoàn thiện", "Nêm lại nước mắm, đường phèn cho vừa khẩu vị đậm đà hài hòa chua cay mặn ngọt đặc trưng của món ăn.", 5),
                    ("Trình bày và thưởng thức", "Múc món ăn ra tô hoặc đĩa sâu lòng, rắc tiêu xay và hành ngò thái nhỏ lên trên. Thưởng thức ngay khi còn nóng sốt cùng cơm trắng hoặc bún tươi.", 5)
                };

                var foodImages = new[]
                {
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80"
                };

                var newRecipes = new List<Recipe>();

                for (int i = 1; i <= recipesToGenerate; i++)
                {
                    var prefix = faker.PickRandom(dishPrefixes);
                    var baseDish = faker.PickRandom(dishNames);
                    var title = $"{prefix} {baseDish} {faker.Commerce.ProductAdjective()} #{currentRecipeCount + i}";

                    var description = $"Công thức chi tiết món {baseDish} với hương vị thơm ngon khó cưỡng. Món ăn thanh đạm, dinh dưỡng dồi dào, phù hợp cho mọi thành viên trong gia đình sum họp cuối tuần.";
                    var instructions = $"Lần lượt thực hiện các bước chuẩn bị, sơ chế, xào nấu và trình bày theo đúng hướng dẫn kỹ thuật bên dưới để đạt chuẩn vị nhà hàng.";

                    var category = faker.PickRandom(allCategories);
                    var author = faker.PickRandom(authors);

                    var prepTime = faker.Random.Int(10, 45);
                    var cookTime = faker.Random.Int(15, 90);
                    var servings = faker.Random.Int(2, 8);
                    var difficulty = faker.PickRandom<RecipeDifficulty>();

                    var recipe = Recipe.Create(
                        title: title,
                        description: description,
                        instructions: instructions,
                        categoryId: category.Id,
                        authorId: author.Id,
                        prepTime: prepTime,
                        cookTime: cookTime,
                        servings: servings,
                        difficulty: difficulty
                    );

                    // 1. Dinh dưỡng
                    recipe.SetNutrition(new RecipeNutrition(
                        Calories: faker.Random.Decimal(250, 750),
                        Protein: faker.Random.Decimal(15, 45),
                        Carbohydrates: faker.Random.Decimal(30, 85),
                        Fat: faker.Random.Decimal(5, 25),
                        Fiber: faker.Random.Decimal(2, 8),
                        Sodium: faker.Random.Decimal(400, 1200)
                    ));

                    // 2. Nguyên liệu: ĐẢM BẢO ÍT NHẤT 10 NGUYÊN LIỆU
                    var ingredientCount = faker.Random.Int(10, 14);
                    var selectedIngredients = faker.PickRandom(rawIngredients, ingredientCount).DistinctBy(x => x.Item1).ToList();
                    while (selectedIngredients.Count < 10)
                    {
                        var extra = faker.PickRandom(rawIngredients);
                        if (!selectedIngredients.Any(x => x.Item1 == extra.Item1))
                        {
                            selectedIngredients.Add(extra);
                        }
                    }

                    for (int ingIndex = 0; ingIndex < selectedIngredients.Count; ingIndex++)
                    {
                        var ingData = selectedIngredients[ingIndex];
                        recipe.Ingredients.Add(RecipeIngredient.Create(
                            recipeId: recipe.Id,
                            name: ingData.Item1,
                            quantity: faker.Random.Decimal(ingData.Item3, ingData.Item4),
                            unit: ingData.Item2,
                            notes: faker.PickRandom("sơ chế sạch", "để ráo nước", "thái miếng vừa ăn", "nêm vừa khẩu vị", null),
                            orderIndex: ingIndex + 1
                        ));
                    }

                    // 3. Các bước chế biến: ĐẢM BẢO ÍT NHẤT 5 BƯỚC
                    var stepCount = faker.Random.Int(5, 7);
                    for (int stepIndex = 0; stepIndex < stepCount; stepIndex++)
                    {
                        var stepTemplate = standardStepTemplates[stepIndex % standardStepTemplates.Length];
                        recipe.Steps.Add(RecipeStep.Create(
                            recipeId: recipe.Id,
                            stepNumber: stepIndex + 1,
                            title: $"{stepTemplate.Item1} (Bước {stepIndex + 1})",
                            description: $"{stepTemplate.Item2} Lưu ý kiểm soát nhiệt độ thích hợp để món ăn đạt độ ngon tuyệt hảo.",
                            timerMinutes: stepTemplate.Item3,
                            imageUrl: faker.PickRandom(foodImages)
                        ));
                    }

                    // 4. Ảnh đại diện chính
                    recipe.Images.Add(RecipeImage.Create(
                        recipeId: recipe.Id,
                        originalUrl: faker.PickRandom(foodImages),
                        altText: $"Món ngon {title}",
                        isPrimary: true,
                        orderIndex: 0
                    ));

                    // 5. Xuất bản recipe (Published)
                    recipe.Publish();

                    newRecipes.Add(recipe);
                }

                await db.Recipes.AddRangeAsync(newRecipes);
                await db.SaveChangesAsync();
                logger.LogInformation("Đã hoàn tất sinh và lưu thành công {Count} công thức mới vào cơ sở dữ liệu!", newRecipes.Count);
            }

            var totalRecipes = await db.Recipes.CountAsync();
            var totalCategories = await db.Categories.CountAsync();
            logger.LogInformation("Tổng kết cơ sở dữ liệu hiện có: {Categories} Categories, {Recipes} Recipes.", totalCategories, totalRecipes);
            logger.LogInformation("Hoàn tất nạp dữ liệu mẫu thành công!");
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Không nạp được dữ liệu mẫu Development.", ex);
        }
    }
}
