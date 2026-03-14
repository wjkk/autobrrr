import { prisma } from '../src/lib/prisma.js';

const subjects = [
  {
    slug: 'seko-host',
    name: 'Seko',
    visibility: 'PUBLIC' as const,
    subjectType: 'HUMAN' as const,
    genderTag: 'FEMALE' as const,
    previewImageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100',
    description: '默认女性主持人主体。',
    promptTemplate: '主体为专业主持人，面部特征稳定，镜头表现自然。',
    sortOrder: 10,
  },
  {
    slug: 'old-master',
    name: '老顽童',
    visibility: 'PUBLIC' as const,
    subjectType: 'HUMAN' as const,
    genderTag: 'MALE' as const,
    previewImageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100',
    description: '老年男性角色。',
    promptTemplate: '主体为老年男性，表情丰富，角色辨识度高。',
    sortOrder: 20,
  },
  {
    slug: 'little-fox',
    name: '小狐狸',
    visibility: 'PUBLIC' as const,
    subjectType: 'CREATURE' as const,
    genderTag: 'UNKNOWN' as const,
    previewImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
    description: '拟人化小狐狸角色。',
    promptTemplate: '主体为拟人化小狐狸，表演生动，动作轻盈。',
    sortOrder: 30,
  },
  {
    slug: 'young-man',
    name: '青年',
    visibility: 'PUBLIC' as const,
    subjectType: 'HUMAN' as const,
    genderTag: 'MALE' as const,
    previewImageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=100',
    description: '年轻男性角色。',
    promptTemplate: '主体为年轻男性，身形稳定，镜头表现自然。',
    sortOrder: 40,
  },
  {
    slug: 'little-girl',
    name: '小女孩',
    visibility: 'PUBLIC' as const,
    subjectType: 'HUMAN' as const,
    genderTag: 'CHILD' as const,
    previewImageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=100',
    description: '儿童角色样例。',
    promptTemplate: '主体为儿童角色，表情灵动，比例自然。',
    sortOrder: 50,
  },
];

const styles = [
  {
    slug: 'cinematic',
    name: '影视质感',
    visibility: 'PUBLIC' as const,
    previewImageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=100',
    description: '电影级布光和镜头感。',
    promptTemplate: '电影质感，真实光影，高级镜头语言。',
    sortOrder: 10,
  },
  {
    slug: 'vivid-realism',
    name: '高饱和写实',
    visibility: 'PUBLIC' as const,
    previewImageUrl: 'https://images.unsplash.com/photo-1621415053503-455b80a1532f?auto=format&fit=crop&q=80&w=100',
    description: '鲜艳色彩的写实风格。',
    promptTemplate: '高饱和色彩，写实材质，清晰细节。',
    sortOrder: 20,
  },
  {
    slug: 'anime',
    name: '日漫二次元',
    visibility: 'PUBLIC' as const,
    previewImageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=100',
    description: '经典日漫插画风格。',
    promptTemplate: '日漫二次元风格，线条干净，角色鲜明。',
    sortOrder: 30,
  },
  {
    slug: 'cartoon-3d',
    name: '3D卡通',
    visibility: 'PUBLIC' as const,
    previewImageUrl: 'https://images.unsplash.com/photo-1627856013091-fed6e4e070c4?auto=format&fit=crop&q=80&w=100',
    description: '3D 卡通质感。',
    promptTemplate: '3D 卡通风格，柔和材质，角色可爱。',
    sortOrder: 40,
  },
  {
    slug: 'ink-oriental',
    name: '水墨国风',
    visibility: 'PUBLIC' as const,
    previewImageUrl: 'https://plus.unsplash.com/premium_photo-1673306778968-5aab577a7365?auto=format&fit=crop&q=80&w=100',
    description: '国风水墨画面表现。',
    promptTemplate: '水墨国风，留白构图，东方美学。',
    sortOrder: 50,
  },
];

async function main() {
  for (const subject of subjects) {
    await prisma.subjectProfile.upsert({
      where: { slug: subject.slug },
      update: subject,
      create: subject,
    });
  }

  for (const style of styles) {
    await prisma.stylePreset.upsert({
      where: { slug: style.slug },
      update: style,
      create: style,
    });
  }

  console.log('[seed-explore-catalogs] ok');
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(`[seed-explore-catalogs] failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
