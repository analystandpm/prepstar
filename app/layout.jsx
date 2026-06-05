export const metadata = {
  title: "PrepStar — Interview answers, tailored to the job",
  description: "Paste the job ad. Get the questions you'll be asked, answer scaffolds, and live coaching.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
