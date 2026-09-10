'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  IconChevronLeft,
  IconEye,
  IconEyeOff,
  IconUser,
} from '@tabler/icons-react'

import FullLogo from '@/app/(DashboardLayout)/layout/shared/logo/FullLogo'
import CardBox from '../shared/CardBox'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const LoginIllustration = () => (
  <svg
    viewBox='0 0 480 420'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    className='w-full max-w-[420px]'
    role='img'
    aria-label='Ilustração de acesso seguro à plataforma'>
    <g
      stroke='currentColor'
      strokeWidth='3'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='text-dark dark:text-white'>
      {/* browser window */}
      <rect x='150' y='60' width='260' height='210' rx='12' fill='none' />
      <line x1='150' y1='100' x2='410' y2='100' />
      <circle cx='172' cy='80' r='5' />
      <circle cx='192' cy='80' r='5' />
      <circle cx='212' cy='80' r='5' />
      <rect x='250' y='72' width='140' height='16' rx='8' />
      {/* avatar card */}
      <circle cx='245' cy='150' r='26' />
      <path d='M222 196c4-16 42-16 46 0' />
      {/* form rows */}
      <rect x='180' y='210' width='200' height='18' rx='9' />
      <circle cx='196' cy='219' r='4' fill='currentColor' />
      <circle cx='214' cy='219' r='4' fill='currentColor' />
      <circle cx='232' cy='219' r='4' fill='currentColor' />
      <rect x='180' y='236' width='200' height='18' rx='9' />
      <circle cx='196' cy='245' r='4' fill='currentColor' />
      <circle cx='214' cy='245' r='4' fill='currentColor' />
      <circle cx='232' cy='245' r='4' fill='currentColor' />
      {/* person */}
      <circle cx='84' cy='150' r='24' />
      <path d='M60 300c0-46 8-84 24-84s24 38 24 84' />
      <path d='M64 210l-18 40M104 210l18 40' />
      <path d='M50 262h68' />
      {/* clipboard */}
      <rect x='96' y='236' width='58' height='74' rx='6' />
      <line x1='108' y1='256' x2='142' y2='256' />
      <line x1='108' y1='272' x2='142' y2='272' />
      <line x1='108' y1='288' x2='128' y2='288' />
      {/* chat check bubble */}
      <circle cx='300' cy='120' r='22' fill='none' className='text-primary' />
      <path d='M291 120l6 6 12-13' className='text-primary' />
      {/* ground line */}
      <line x1='40' y1='330' x2='360' y2='330' />
    </g>
    <g strokeLinecap='round' strokeLinejoin='round'>
      {/* shield */}
      <path
        d='M392 214l40 14v46c0 30-22 46-40 54-18-8-40-24-40-54v-46l40-14z'
        className='fill-primary/10 stroke-primary'
        strokeWidth='3'
      />
      <circle
        cx='392'
        cy='262'
        r='9'
        className='fill-none stroke-primary'
        strokeWidth='3'
      />
      <path
        d='M392 271v14'
        className='stroke-primary'
        strokeWidth='3'
      />
    </g>
  </svg>
)

export const Login = () => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className='min-h-screen w-full flex justify-center items-center bg-lightprimary p-4 sm:p-6'>
      <div className='w-full max-w-[960px]'>
        <CardBox className='gap-0 p-0! overflow-hidden'>
          <div className='grid md:grid-cols-2'>
            {/* Illustration panel */}
            <div className='hidden md:flex flex-col items-center justify-center gap-8 bg-lightgray dark:bg-darkmuted/40 p-10'>
              <LoginIllustration />
              <FullLogo />
            </div>

            {/* Form panel */}
            <div className='flex flex-col p-8 sm:p-10'>
              <Link
                href='/'
                className='inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary transition-colors mb-8'>
                <IconChevronLeft size={18} />
                Voltar
              </Link>

              <h2 className='text-2xl font-semibold text-dark dark:text-white mb-8'>
                Faça login na nossa plataforma
              </h2>

              <form className='flex flex-col gap-7'>
                <div className='relative'>
                  <Label
                    htmlFor='username'
                    className='text-sm font-normal text-muted mb-2'>
                    Usuário
                  </Label>
                  <div className='relative'>
                    <input
                      id='username'
                      type='text'
                      autoComplete='username'
                      required
                      className='w-full bg-transparent border-0 border-b border-defaultBorder pb-2 pr-8 text-sm text-link dark:text-white outline-none focus:border-primary transition-colors'
                    />
                    <IconUser
                      size={20}
                      className='absolute right-0 bottom-2 text-darklink pointer-events-none'
                    />
                  </div>
                </div>

                <div className='relative'>
                  <Label
                    htmlFor='password'
                    className='text-sm font-normal text-muted mb-2'>
                    Senha
                  </Label>
                  <div className='relative'>
                    <input
                      id='password'
                      type={showPassword ? 'text' : 'password'}
                      autoComplete='current-password'
                      required
                      className='w-full bg-transparent border-0 border-b border-defaultBorder pb-2 pr-8 text-sm text-link dark:text-white outline-none focus:border-primary transition-colors'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className='absolute right-0 bottom-1.5 text-darklink hover:text-primary transition-colors'>
                      {showPassword ? (
                        <IconEye size={20} />
                      ) : (
                        <IconEyeOff size={20} />
                      )}
                    </button>
                  </div>
                </div>

                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='flex items-center gap-2'>
                    <Checkbox id='remember' />
                    <Label
                      htmlFor='remember'
                      className='text-sm font-normal text-muted'>
                      Lembrar-me
                    </Label>
                  </div>
                  <Link
                    href='#'
                    className='text-sm font-medium text-primary hover:text-primaryemphasis'>
                    Esqueceu a senha?
                  </Link>
                </div>

                <Button className='w-full mt-1' shape='pill' size='lg' asChild>
                  <Link href='/'>Entrar</Link>
                </Button>
              </form>
            </div>
          </div>
        </CardBox>
      </div>
    </div>
  )
}
