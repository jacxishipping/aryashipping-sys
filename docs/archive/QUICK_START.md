# 🚀 JACXI Shipping - Quick Start Guide

## Welcome!

This guide will help you get the JACXI Shipping platform up and running in minutes.

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or hosted)
- Git

## ⚡ Quick Start (5 Minutes)

### Step 1: Environment Setup

Create a `.env.local` file in the project root:

```env
# Database - IMPORTANT: Use these exact variable names
# The Prisma schema requires jacxi_DATABASE_URL and jacxi_POSTGRES_URL
jacxi_DATABASE_URL="postgresql://username:password@localhost:5432/jacxi_shipping"
jacxi_POSTGRES_URL="postgresql://username:password@localhost:5432/jacxi_shipping"

# Optional: Some older scripts may check for DATABASE_URL, but they actually use jacxi_DATABASE_URL
# You can set this for compatibility, but it's not used by the app
DATABASE_URL="postgresql://username:password@localhost:5432/jacxi_shipping"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-generate-with-openssl-rand-base64-32"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**⚠️ Important:** The Prisma schema uses `jacxi_DATABASE_URL` and `jacxi_POSTGRES_URL` (not just `DATABASE_URL`). Make sure to include all three!

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Apply database migrations (includes loginCode field)
npx prisma migrate deploy

# Seed initial data (optional)
npm run db:seed
```

This will:
- Generate Prisma Client
- Apply all migrations to database (including the loginCode field)
- Seed initial data

**Alternative:** Use the automated fix script:
```bash
bash scripts/fix-logincode.sh
```

### Step 4: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser! 🎉

## 🎯 What You Get

### ✅ Fully Functional Platform
- User registration and authentication
- Multilingual support (English, Dari, Pashto)
- Responsive design
- Modern UI with animations

### ✅ Pages Ready to Use
- Homepage with hero section
- Services page
- Process page
- Tracking page
- Testimonials page
- About page
- Contact page

### ✅ Database Models
- User management
- Shipments
- Quotes
- Payments
- Contact forms
- Newsletter subscriptions
- Blog posts
- Testimonials

## 🛠️ Common Commands

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linter
```

### Database
```bash
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema changes
npm run db:studio    # Open Prisma Studio (GUI)
npm run db:backup    # Backup database
npm run db:reset     # Reset database
```

## 🔐 Default Users

After running the seed script, you'll have:

- **Admin**: `admin@jacxi.com` / `admin123`
- **Customer**: `customer@example.com` / `customer123`

## 📱 Test the Platform

1. **Visit Homepage**: http://localhost:3000
2. **Sign Up**: http://localhost:3000/auth/signup
3. **Sign In**: http://localhost:3000/auth/signin
4. **Explore Pages**: Navigate through all pages using the navigation menu

## 🌐 Languages

The platform supports 3 languages:
- English (Default)
- Dari
- Pashto

Use the language switcher in the navigation bar to switch languages.

## 🐛 Troubleshooting

### loginCode Column Error
If you see: `The column User.loginCode does not exist in the current database`

**Quick Fix:**
```bash
bash scripts/fix-logincode.sh
```

Or manually:
```bash
npm run db:generate
npx prisma migrate deploy
```

**See:** [FIX_LOGINCODE_ERROR.md](./FIX_LOGINCODE_ERROR.md) for detailed troubleshooting.

### Database Connection Issues
- Verify PostgreSQL is running
- Check `jacxi_DATABASE_URL` in `.env.local` (not just `DATABASE_URL`)
- Ensure database exists

### Build Errors
- Delete `.next` folder and rebuild
- Run `npm install` again
- Check Node.js version (18+)

### Prisma Issues
- Run `npm run db:generate`
- Run `npx prisma migrate deploy`
- Check schema in `prisma/schema.prisma`

## 📚 Next Steps

1. **Customize Content**: Update text in translation files
2. **Add Services**: Configure your shipping services
3. **Set Up OAuth**: Add Google OAuth credentials
4. **Configure Domain**: Update URLs for production
5. **Add Payments**: Integrate payment gateway
6. **Deploy**: Follow deployment guide

## 🆘 Need Help?

- Check `DATABASE_SETUP.md` for database setup
- Check `PROJECT_STATUS.md` for project status
- Check `README.md` for overview

## 🎉 You're All Set!

Your JACXI Shipping platform is now running. Start customizing it to match your needs!

---

**Happy Shipping! 🚢**

Here’s a practical roadmap for getting this Next.js/Prisma app running on AWS. The stack assumes you’re comfortable building a container image and managing AWS resources. Adjust any step to fit your preferred AWS service (Elastic Beanstalk, ECS/Fargate, or EC2 + PM2) — the requirements are essentially the same.

---

## 1. Choose a Hosting Strategy

| Option | Pros | Notes |
| --- | --- | --- |
| **Elastic Beanstalk (Docker)** | Easiest “managed” VM experience | Supports single Dockerfile + load balancing + rolling updates |
| **ECS Fargate** | Fully containerized, no servers | Good for production with autoscaling; a bit more setup |
| **EC2 + PM2** | Maximum control | You manage the OS and service; simple but manual |
| **Amplify / Lambda** | Not recommended here | Next.js 16 SSR + Prisma is better on a long-lived Node server |

The instructions below assume **Elastic Beanstalk with Docker**, because it balances convenience and control.

---

## 2. Prepare the App for Production

1. **Create a Dockerfile** (at `jacxi-shipping/Dockerfile`). Example:

   ```dockerfile
   FROM node:18-alpine

   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production

   COPY . .
   RUN npm run build

   ENV NODE_ENV=production
   EXPOSE 3000
   CMD ["npm", "run", "start"]
   ```

2. **Configure environment variables** in `.env.production`:

   ```env
   DATABASE_URL="postgresql://<USER>:<PASS>@<HOST>:5432/<DB>?schema=public"
   NEXTAUTH_SECRET="your_generated_secret"
   NEXTAUTH_URL="https://your-domain"
   ```

   (Stage secrets in AWS, not in git.)

3. **Adjust uploads**: the app currently writes images to `public/uploads`. In production, point uploads to S3 (e.g., bucket `jacxi-uploads`). Update `/api/upload` to use AWS SDK (you can do this later, but local disk isn’t shared across instances).

---

## 3. Provision AWS Resources

1. **PostgreSQL**: Create an RDS instance (e.g., RDS PostgreSQL). Note endpoint, username, password, DB name. Open inbound rules to your app subnets or security groups.

2. **S3 bucket (optional but recommended)**: e.g., `jacxi-uploads-prod`. Grant your ECS/EB role write access.

3. **IAM role**: For Elastic Beanstalk/ECS, ensure the instance/task role can reach S3 (if using) and RDS (VPC security groups).

4. **DNS/SSL**: Plan to terminate SSL either via ELB or a reverse proxy (e.g., AWS Certificate Manager bound to the load balancer).

---

## 4. Deploy with Elastic Beanstalk (Docker)

1. **Install EB CLI**:
   ```bash
   pip install awsebcli
   ```

2. **Initialize EB**:
   ```bash
   cd jacxi-shipping
   eb init
   ```
   - Select region
   - Choose Docker platform
   - Create application (e.g., `jacxi-shipping-prod`)

3. **Create environment**:
   ```bash
   eb create jacxi-prod-env --single --timeout 30
   ```
   Choose load-balanced or single-instance. For production, keep load-balanced.

4. **Set environment variables**:
   ```bash
   eb setenv DATABASE_URL=... NEXTAUTH_SECRET=... NEXTAUTH_URL=...
   ```
   Add any other envs you rely on.

5. **Deploy**:
   ```bash
   eb deploy
   ```

6. **Run migrations** (once per deployment):
   ```bash
   eb ssh jacxi-prod-env
   cd /app
  npx prisma migrate deploy
   exit
   ```
   (Alternatively, put the command in an `.ebextensions` hook.)

---

## 5. ECS Fargate Alternative (Optional)

1. Build and push Docker image to ECR:
   ```bash
   aws ecr create-repository --repository-name jacxi-shipping
   docker build -t jacxi-shipping .
   docker tag jacxi-shipping:latest <ECR_URL>/jacxi-shipping:latest
   docker push <ECR_URL>/jacxi-shipping:latest
   ```

2. Create ECS cluster (Fargate), task definition referencing the image, service with load balancer.

3. Set environment variables on the task definition, connect to RDS security group.

4. Run migrations (ECS task exec or CI step):
   ```bash
   aws ecs execute-command --cluster yourCluster --task taskId --container app --command "npx prisma migrate deploy" --interactive
   ```

---

## 6. Ongoing Ops

- **Migrate DB** each release (`npx prisma migrate deploy`).
- **Backups**: Use `scripts/backup-db.js` or AWS RDS snapshots.
- **Monitoring**: Enable CloudWatch logs for `stdout`/`stderr`.
- **Scale**: Adjust EB autoscaling or ECS service to handle load.
- **S3 uploads**: Ensure `/api/upload` now streams to S3 and that S3 URL is returned to the client.

---

## 7. Quick Checklist

- [ ] Dockerfile builds cleanly.
- [ ] `.env.production` is correctly configured.
- [ ] Prisma migrations executed against RDS.
- [ ] `NEXTAUTH_SECRET` generated (`openssl rand -hex 32`).
- [ ] Optional: update upload API to S3, configure IAM and bucket.
- [ ] Monitor logs (`eb logs -f` or CloudWatch) after deployment.

---

### Summary

1. Containerize the app (Dockerfile).
2. Provision RDS (Postgres) and S3 if needed.
3. Deploy via Elastic Beanstalk (simplest) or ECS Fargate.
4. Apply `prisma migrate deploy`.
5. Configure environment variables and SSL.
6. Update upload logic to use S3 for production reliability.

Once you’re comfortable with AWS basics, the EB approach lets you focus on the app while AWS handles most of the scaling and health checks.
