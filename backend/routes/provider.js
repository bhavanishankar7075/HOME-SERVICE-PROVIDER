router.put('/profile', auth, async (req, res) => {
  const { name, phone, location } = req.body;
  try {
    const provider = await Provider.findByIdAndUpdate(
      req.user.id,
      { name, phone, location: { type: 'Point', coordinates: [parseFloat(location.split(',')[0]), parseFloat(location.split(',')[1])] } },
      { new: true, runValidators: true }
    ).populate('appointments services');
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    res.json(provider);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/appointments', auth, async (req, res) => {
  try {
    const appointments = await Appointment.find({ providerId: req.user.id }).populate('customerId service');
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});