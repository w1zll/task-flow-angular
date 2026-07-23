import {
  alpha,
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import React, { ReactNode, RefObject } from 'react';

interface Feature {
  id: string;
  icon: ReactNode;
  title: string;
  desc: string;
}

interface Props {
  features: Feature[];
  featuresRef: RefObject<HTMLDivElement | null>;
  featuresTitleRef: RefObject<HTMLHeadingElement | null>;
  featuresSubtitleRef: RefObject<HTMLParagraphElement | null>;
  cardsRef: RefObject<HTMLDivElement[]>;
}

const Features = ({
  features,
  featuresRef,
  featuresTitleRef,
  featuresSubtitleRef,
  cardsRef,
}: Props) => {
  const t = useTranslations('HomePage.features');

  return (
    <Container ref={featuresRef} maxWidth="lg" sx={{ pb: 12, pt: 8 }}>
      <Typography
        ref={featuresTitleRef}
        variant="h4"
        sx={{ mb: 1, opacity: 0, fontWeight: 700, textAlign: 'center' }}
      >
        {t('heading')}
      </Typography>
      <Typography
        ref={featuresSubtitleRef}
        variant="body1"
        color="text.secondary"
        sx={{ mb: 6, opacity: 0, textAlign: 'center' }}
      >
        {t('subheading')}
      </Typography>

      <Grid container spacing={3}>
        {features.map((f, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.id}>
            <Card
              ref={(el) => {
                if (el) {
                  cardsRef.current[i] = el as HTMLDivElement;
                } else {
                  delete cardsRef.current[i];
                }
              }}
              sx={{
                height: '100%',
                p: 0.5,
                opacity: 0,
                borderRadius: '8px',
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '6px',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  {f.icon}
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  {f.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.6 }}
                >
                  {f.desc}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Features;
