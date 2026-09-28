import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const page = req.nextUrl.searchParams.get('page') || '1'
    const pageSize = req.nextUrl.searchParams.get('pageSize') || '10'
    const skip = (parseInt(page) - 1) * parseInt(pageSize)

    const properties = await prisma.property.findMany({
      skip,
      take: parseInt(pageSize),
      include: {
        advisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const total = await prisma.property.count()

    return NextResponse.json({
      success: true,
      data: properties,
      meta: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
      },
    })
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch properties',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const property = await prisma.property.create({
      data: {
        title: body.title,
        description: body.description,
        slug: body.title.toLowerCase().replace(/\s+/g, '-'),
        type: body.type,
        price: body.price,
        address: body.address,
        city: body.city,
        region: body.region,
        bedrooms: body.bedrooms,
        bathrooms: body.bathrooms,
        areaSquareMeters: body.areaSquareMeters,
        images: body.images || [],
        advisorId: body.advisorId,
        organizationId: body.organizationId,
        status: 'AVAILABLE',
      },
      include: {
        advisor: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: property,
    })
  } catch (error) {
    console.error('Error creating property:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to create property',
        },
      },
      { status: 400 }
    )
  }
}
