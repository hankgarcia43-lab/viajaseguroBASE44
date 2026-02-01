import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { 
  Star, Loader2, CheckCircle, Car, AlertCircle, 
  MessageCircle, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function RateRide() {
  const [ride, setRide] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadRide();
  }, []);

  const loadRide = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const rideId = params.get('rideId');

      if (!rideId) {
        navigate(createPageUrl('PassengerHistory'));
        return;
      }

      const rides = await base44.entities.Ride.filter({ id: rideId });
      if (rides.length === 0) {
        navigate(createPageUrl('PassengerHistory'));
        return;
      }

      setRide(rides[0]);
      
      if (rides[0].driver_rating) {
        setRating(rides[0].driver_rating);
        setReview(rides[0].driver_review || '');
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error loading ride:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Selecciona una calificación');
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.Ride.update(ride.id, {
        driver_rating: rating,
        driver_review: review
      });

      // Update driver's average rating
      const drivers = await base44.entities.Driver.filter({ id: ride.driver_id });
      if (drivers.length > 0) {
        const driver = drivers[0];
        const allRides = await base44.entities.Ride.filter({ 
          driver_id: driver.id, 
          status: 'completed' 
        });
        
        const ratedRides = allRides.filter(r => r.driver_rating);
        const avgRating = ratedRides.reduce((sum, r) => sum + r.driver_rating, 0) / ratedRides.length;
        
        await base44.entities.Driver.update(driver.id, {
          rating: Math.round(avgRating * 10) / 10
        });
      }

      setSubmitted(true);
      toast.success('¡Gracias por tu calificación!');

      setTimeout(() => {
        navigate(createPageUrl('PassengerHistory'));
      }, 2000);

    } catch (error) {
      toast.error('Error al enviar calificación');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Gracias!</h1>
          <p className="text-slate-500">Tu calificación ayuda a mejorar el servicio</p>
          <div className="flex justify-center gap-1 mt-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-8 h-8 ${
                  star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-lg mx-auto pt-8">
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-8">
          ¿Cómo estuvo tu viaje?
        </h1>

        {/* Driver Info */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden">
                {ride.driver_photo ? (
                  <img src={ride.driver_photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Car className="w-8 h-8 text-slate-400" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{ride.driver_name}</h3>
                <p className="text-slate-500">{ride.vehicle_model} • {ride.vehicle_plate}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between text-sm">
              <div>
                <p className="text-slate-500">Distancia</p>
                <p className="font-semibold">{ride.distance_km} km</p>
              </div>
              <div>
                <p className="text-slate-500">Duración</p>
                <p className="font-semibold">{ride.duration_min} min</p>
              </div>
              <div>
                <p className="text-slate-500">Total</p>
                <p className="font-semibold">${ride.fare_final || ride.fare_estimated} MXN</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating Stars */}
        <div className="flex justify-center gap-3 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`w-12 h-12 transition-colors ${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-slate-300'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Rating Labels */}
        <p className="text-center text-slate-600 mb-8">
          {rating === 1 && 'Muy malo'}
          {rating === 2 && 'Malo'}
          {rating === 3 && 'Regular'}
          {rating === 4 && 'Bueno'}
          {rating === 5 && '¡Excelente!'}
          {rating === 0 && 'Toca las estrellas para calificar'}
        </p>

        {/* Review */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-600">Comentario (opcional)</span>
          </div>
          <Textarea
            placeholder="Cuéntanos sobre tu experiencia..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-lg"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Enviar calificación
            </>
          )}
        </Button>

        {/* Report Link */}
        <button
          onClick={() => navigate(createPageUrl('ReportIncident') + `?rideId=${ride.id}`)}
          className="w-full mt-4 flex items-center justify-center gap-2 text-red-600 hover:text-red-700 py-3"
        >
          <AlertCircle className="w-5 h-5" />
          Reportar un problema
        </button>
      </div>
    </div>
  );
}