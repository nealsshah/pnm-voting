This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## PNM Voting Application

This application allows fraternity brothers to vote on Potential New Members (PNMs) during the recruitment process.

### PNM Data Management

PNM data is managed through a simple CSV import system. Here's how it works:

1. Admins can download a CSV template from the admin dashboard's PNM tab
2. The template includes headers: `email,first_name,last_name,major,year,gpa`
3. After filling out the template with PNM information, admins can upload it via the dashboard
4. The system will upsert the data into the database, handling duplicates by email address
5. The UI automatically refreshes for all connected users when new PNM data is uploaded

Benefits of the CSV approach:
- Self-contained workflow with no external dependencies
- Works offline - admins can prepare the data without internet connectivity
- Fast and reliable - no API quotas or rate limits to worry about
- Immediate feedback - see exactly how many records were imported or skipped

### Comments System

The platform includes a comprehensive comment system for brothers to provide qualitative feedback on PNMs:

1. **Comment Features**:
   - Text-only comments with no length cap
   - Anonymous posting option
   - Edit/delete capability while a round is open
   - Real-time updates for all users

2. **Admin Moderation**:
   - Access the comment moderation dashboard at `/admin/comments`
   - Filter comments by PNM or round
   - Search for specific content
   - Delete inappropriate comments as needed
   
3. **Technical Implementation**:
   - Uses Supabase Realtime Channels for instant updates
   - Row-Level Security ensures brothers can only edit their own comments
   - Comments remain visible forever to all brothers for institutional memory
   - Admin override allows removal of inappropriate content

### Technical Architecture

The application uses:
- Next.js for the frontend and API routes
- Supabase for authentication, database, and realtime updates
- Supabase Realtime for instant UI updates when new PNMs are added

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
