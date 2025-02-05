import mongoose from 'mongoose';

const userGeoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ip: {
      type: String,
      required: true,
    },
    org: {
      type: String,
      required: true,
    },
    postal: {
      type: String,
      required: true,
    },
    version: {
      type: String,
      required: true,
    },
    country_name: {
      type: String,
      required: true,
    },
    network: {
      type: String,
      required: true,
    },
    country_capital: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const UserGeo = mongoose.model('UserGeo', userGeoSchema);

export default UserGeo;
