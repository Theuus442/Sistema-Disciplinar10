export default function handler(_req: any, res: any) {
  res.status(404).json({ error: 'Endpoint not found' });
}
